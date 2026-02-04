const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron')
const path = require('path')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')
const chokidar = require('chokidar')
const fs = require('fs')
const axios = require('axios')
const bwipjs = require('bwip-js')
const mysql = require('mysql2/promise')
const crypto = require('crypto')
const iconv = require('iconv-lite')
// Removido: Google Cloud Storage - ahora usamos API Laravel

// Configuración persistente
const store = new Store({
  defaults: {
    apiUrl: 'http://localhost:8000/api/v1/documentos',
    apiToken: '', // Bearer Token de 64 caracteres
    basePath: 'C:\\iGlobal', // Ruta base donde se encuentran las carpetas de empresa
    rut: '', // RUT de la empresa (sin puntos, con guión)
    autoStart: true,
    watcherEnabled: false,
    generatePDF417: true, // Generar código PDF417 del TED
    uploadInterval: 30000, // Intervalo para subir archivos de pending/ (30 segundos)
    // Configuración de MySQL para conectar con el ERP
    mysqlHost: 'localhost',
    mysqlPort: 3306,
    mysqlUser: 'root',
    mysqlPassword: '',
    mysqlDatabase: 'iglobal_dte',
    // Configuración para descargar CAF desde API
    cafEnabled: true,
    folioPath: 'C:\\iGlobal\\RUT_EMPRESA\\FOLIO',
    // Configuración de emails
    emailNotifications: false,
    emailTo: '',
    emailFrom: 'dte-client@iglobal.cl',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    // Configuración de reintentos
    maxRetries: 3,
    retryDelay: 10000 // 10 segundos
  }
})

// Forzar actualización de valores por defecto si están desactualizados
if (store.get('uploadInterval') === 120000) {
  store.set('uploadInterval', 30000)
  console.log('Upload interval actualizado a 30 segundos')
}

let mainWindow
let tray = null
let watcher = null
let logs = []
let uploadInterval = null // Intervalo para subir archivos desde pending/
let logIdCounter = 0 // Contador para IDs únicos de logs
let isProcessingQueue = false // Flag para evitar procesamiento concurrente
let processingQueue = [] // Cola de archivos a procesar
let isUploadingPending = false // Flag para evitar múltiples subidas simultáneas
let cafSyncInterval = null // Intervalo para sincronizar CAF (cada 1 hora)

// Helper: Obtener rutas dinámicas basadas en el RUT configurado
function getPaths() {
  const basePath = store.get('basePath')
  const rut = store.get('rut')

  if (!rut) {
    // Si no hay RUT configurado, usar carpeta genérica
    return {
      watchPath: path.join(basePath, 'XML'),
      processedPath: path.join(basePath, 'XML', 'PROCESADO'),
      failedPath: path.join(basePath, 'XML', 'FALLIDOS'),
      pendingPath: path.join(basePath, 'XML', 'PENDING'),
      sentPath: path.join(basePath, 'XML', 'SENT'),
      pngPath: path.join(basePath, 'PNG'),
      folioPath: path.join(basePath, 'FOLIO')
    }
  }

  // Rutas dinámicas usando el RUT
  const rutFolder = path.join(basePath, rut)

  return {
    watchPath: path.join(rutFolder, 'XML'),
    processedPath: path.join(rutFolder, 'XML', 'PROCESADO'),
    failedPath: path.join(rutFolder, 'XML', 'FALLIDOS'),
    pendingPath: path.join(rutFolder, 'XML', 'PENDING'),
    sentPath: path.join(rutFolder, 'XML', 'SENT'),
    pngPath: path.join(rutFolder, 'PNG'),
    folioPath: path.join(rutFolder, 'FOLIO')
  }
}

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../public/icon.png'),
    autoHideMenuBar: true
  })

  // Development vs Production
  // Intenta cargar desde Vite primero (desarrollo)
  mainWindow.loadURL('http://localhost:5173').catch(() => {
    // Si falla, carga desde dist (producción)
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'))
  })

  // Abrir DevTools en desarrollo
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  // Minimizar a system tray en lugar de cerrar
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()

      // Mostrar notificación la primera vez
      if (!store.get('trayNotificationShown')) {
        tray.displayBalloon({
          title: 'iGlobal DTE',
          content: 'La aplicación sigue ejecutándose en segundo plano'
        })
        store.set('trayNotificationShown', true)
      }
    }
    return false
  })

  // Auto-iniciar watcher si está configurado
  if (store.get('autoStart') && store.get('watcherEnabled')) {
    setTimeout(() => {
      startWatcher()
    }, 2000)
  }
}

// Crear system tray
function createTray() {
  // Ruta al icono (buscar en assets/ o public/)
  let iconPath = path.join(__dirname, '../assets/icon.png')

  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../public/icon.png')
  }

  // Verificar si el icono existe
  if (!fs.existsSync(iconPath)) {
    addLog('warning', 'Icono del tray no encontrado. Usando icono por defecto.')
    // Crear un icono simple como fallback
    const { nativeImage } = require('electron')
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)
  } else {
    tray = new Tray(iconPath)
  }

  updateTrayMenu()

  // Doble clic para mostrar ventana
  tray.on('double-click', () => {
    mainWindow.show()
  })
}

// Actualizar menú del tray con el estado actual
function updateTrayMenu() {
  if (!tray) return

  const isActive = watcher !== null

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar aplicación',
      click: () => {
        mainWindow.show()
      }
    },
    { type: 'separator' },
    {
      label: isActive ? '● Monitoreo Activo' : '○ Monitoreo Detenido',
      enabled: false
    },
    {
      label: isActive ? 'Detener monitoreo' : 'Iniciar monitoreo',
      click: () => {
        if (isActive) {
          stopWatcher()
        } else {
          startWatcher()
        }
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Verificar actualizaciones',
      click: () => {
        if (app.isPackaged) {
          autoUpdater.checkForUpdates()
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Modo Desarrollo',
            message: 'El auto-updater solo funciona en la versión compilada de la aplicación.',
            buttons: ['OK']
          })
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Cerrar aplicación',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  const tooltip = isActive
    ? 'iGlobal DTE - Monitoreo Activo ●'
    : 'iGlobal DTE - Detenido'

  tray.setToolTip(tooltip)
  tray.setContextMenu(contextMenu)
}

// Agregar log
function addLog(type, message) {
  // Generar ID único usando solo contador incremental (garantiza unicidad absoluta)
  logIdCounter++

  const log = {
    id: logIdCounter,
    timestamp: new Date().toISOString(),
    type, // info, success, error, warning
    message
  }

  logs.unshift(log)

  // Mantener solo últimos 100 logs en memoria
  if (logs.length > 100) {
    logs = logs.slice(0, 100)
  }

  // Enviar a renderer
  if (mainWindow) {
    mainWindow.webContents.send('new-log', log)
  }
}

// Consultar CAF desde MySQL
async function getCAF(rutEmisor, tipoDTE, folio) {
  let connection
  try {
    // Crear conexión a MySQL
    connection = await mysql.createConnection({
      host: store.get('mysqlHost'),
      port: store.get('mysqlPort'),
      user: store.get('mysqlUser'),
      password: store.get('mysqlPassword'),
      database: store.get('mysqlDatabase')
    })

    // Remover guión del RUT para la consulta
    const rutSinGuion = rutEmisor.replace('-', '')

    // Consulta SQL (usando nombres de columnas en MAYÚSCULAS según schema MySQL)
    const [rows] = await connection.execute(
      `SELECT FOL_RNG_D, FOL_RNG_H, FOL_FA, FOL_RSAPK_M, FOL_RSAPK_E, FOL_IDK, FOL_FRMA, FOL_RSASK, FOL_RSAPUBK, FOL_RE, FOL_RS
       FROM folio
       WHERE ORG_RUT = ? AND FOL_TD = ? AND ? BETWEEN FOL_RNG_D AND FOL_RNG_H`,
      [rutSinGuion, tipoDTE, folio]
    )

    if (rows.length === 0) {
      addLog('error', `No se encontró CAF para RUT: ${rutEmisor}, Tipo: ${tipoDTE}, Folio: ${folio}`)
      return null
    }


    const caf = {
      fol_rng_d: rows[0].FOL_RNG_D,
      fol_rng_h: rows[0].FOL_RNG_H,
      fol_fa: rows[0].FOL_FA,
      fol_rsapk_m: rows[0].FOL_RSAPK_M,
      fol_rsapk_e: rows[0].FOL_RSAPK_E,
      fol_idk: rows[0].FOL_IDK,
      fol_frma: rows[0].FOL_FRMA,
      fol_rsask: rows[0].FOL_RSASK,
      fol_rsapubk: rows[0].FOL_RSAPUBK,
      fol_re: rows[0].FOL_RE,
      fol_rs: rows[0].FOL_RS
    }

    return caf
  } catch (error) {
    addLog('error', `Error consultando CAF: ${error.message}`)
    return null
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Convertir caracteres especiales (igual que C#)
function convertirCaracteres(cadena) {
  return cadena
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/''/g, '&apos;')
}

// Generar TED (DD + FRMT) - Portado desde C#
async function generateTED(xmlContent, rutEmisor, tipoDTE, folio) {
  try {
    // Parsear XML para extraer datos necesarios
    const fechaMatch = xmlContent.match(/<FchEmis>([^<]+)<\/FchEmis>/)
    const rutRecepMatch = xmlContent.match(/<RUTRecep>([^<]+)<\/RUTRecep>/)
    const rznSocRecepMatch = xmlContent.match(/<RznSocRecep>([^<]+)<\/RznSocRecep>/)
    const mntTotalMatch = xmlContent.match(/<MntTotal>([^<]+)<\/MntTotal>/)
    const nmbItemMatch = xmlContent.match(/<NmbItem>([^<]+)<\/NmbItem>/)

    // Extraer razón social del emisor (depende si es boleta o no)
    let rznSocMatch
    if (tipoDTE === '39' || tipoDTE === '41') {
      rznSocMatch = xmlContent.match(/<RznSocEmisor>([^<]+)<\/RznSocEmisor>/)
    } else {
      rznSocMatch = xmlContent.match(/<RznSoc>([^<]+)<\/RznSoc>/)
    }

    if (!fechaMatch || !rutRecepMatch || !rznSocRecepMatch || !mntTotalMatch || !nmbItemMatch || !rznSocMatch) {
      addLog('error', 'No se pudieron extraer todos los datos necesarios del XML')
      return null
    }

    const fchEmis = fechaMatch[1]
    const rutRecep = rutRecepMatch[1]
    const rznSocRecep = rznSocRecepMatch[1]
    const mntTotal = mntTotalMatch[1]
    let it1 = nmbItemMatch[1]
    const rznSoc = rznSocMatch[1]

    // Convertir caracteres especiales del IT1 y limitarlo a 40 caracteres
    it1 = convertirCaracteres(it1)
    if (it1.length > 40) {
      it1 = it1.substring(0, 40)
    }

    // Consultar CAF desde MySQL
    const caf = await getCAF(rutEmisor, tipoDTE, folio)
    if (!caf) {
      addLog('error', 'No se pudo obtener el CAF')
      return null
    }

    // Generar timestamp
    const now = new Date()
    const tmstFirma = now.toISOString().replace(/\.\d{3}Z$/, '')

    // Construir DD (igual que en C#)
    const DD_FRMT = `<DD><RE>${rutEmisor}</RE><TD>${tipoDTE}</TD><F>${folio}</F><FE>${fchEmis}</FE><RR>${rutRecep}</RR><RSR>${rznSocRecep}</RSR><MNT>${mntTotal}</MNT><IT1>${it1}</IT1><CAF version="1.0"><DA><RE>${rutEmisor}</RE><RS>${convertirCaracteres(rznSoc)}</RS><TD>${tipoDTE}</TD><RNG><D>${caf.fol_rng_d}</D><H>${caf.fol_rng_h}</H></RNG><FA>${caf.fol_fa}</FA><RSAPK><M>${caf.fol_rsapk_m}</M><E>${caf.fol_rsapk_e}</E></RSAPK><IDK>${caf.fol_idk}</IDK></DA><FRMA algoritmo="SHA1withRSA">${caf.fol_frma}</FRMA></CAF><TSTED>${tmstFirma}</TSTED></DD>`

    // Firmar DD con la llave privada del CAF (RSA SHA1)
    const ddBuffer = Buffer.from(DD_FRMT, 'utf8')
    const hashValue = crypto.createHash('sha1').update(ddBuffer).digest()

    // Decodificar la llave privada PEM del CAF
    const privateKey = caf.fol_rsask

    // Firmar el hash con RSA
    const sign = crypto.createSign('RSA-SHA1')
    sign.update(DD_FRMT)
    sign.end()

    const signature = sign.sign(privateKey, 'base64')

    // Construir FRMT
    const FRMT = `\n<FRMT algoritmo="SHA1withRSA">${signature}</FRMT>`

    // Construir TED completo
    const TED = `<TED version="1.0">\n${DD_FRMT}${FRMT}\n</TED>`

    addLog('success', `TED generado exitosamente para folio ${folio}`)

    return { TED, tmstFirma }
  } catch (error) {
    addLog('error', `Error generando TED: ${error.message}`)
    return null
  }
}

// Sincronizar CAF desde API REST v2 y guardar en MySQL
async function syncCAFFromAPI() {
  if (!store.get('cafEnabled')) {
    addLog('info', 'Sincronización de CAF desactivada')
    return { success: false, message: 'Sincronización de CAF desactivada' }
  }

  let connection
  let cafCount = 0
  let cafUpdated = 0

  try {
    addLog('info', '🔄 Sincronizando CAF desde API REST v2...')

    // Validar Bearer Token
    const apiToken = store.get('apiToken')
    if (!apiToken || apiToken.trim().length === 0) {
      addLog('error', 'Bearer Token no configurado')
      return { success: false, message: 'Bearer Token no configurado' }
    }

    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: store.get('mysqlHost'),
      port: store.get('mysqlPort'),
      user: store.get('mysqlUser'),
      password: store.get('mysqlPassword'),
      database: store.get('mysqlDatabase')
    })

    // Obtener RUT configurado
    const configuredRut = store.get('rut')
    if (!configuredRut) {
      addLog('warning', 'RUT no configurado')
      return { success: false, message: 'RUT no configurado' }
    }

    // Llamar al API REST v2 para obtener todos los CAF
    const baseUrl = store.get('apiUrl').replace(/\/api\/v1\/documentos.*$/, '')
    const cafApiUrl = `${baseUrl}/api/v1/caf`.replace('localhost', '127.0.0.1')

    addLog('info', `Consultando CAF desde: ${cafApiUrl}`)

    const response = await axios.get(cafApiUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      timeout: 60000, // 60 segundos
      family: 4 // Forzar IPv4
    })

    if (!response.data || !response.data.cafs || response.data.cafs.length === 0) {
      addLog('info', 'No se encontraron CAF en el API')
      return { success: true, message: 'No hay CAF disponibles', count: 0 }
    }

    const cafs = response.data.cafs
    const empresaInfo = response.data.empresa

    addLog('info', `📦 ${cafs.length} CAF(s) encontrados para ${empresaInfo.razon_social}`)

    // Obtener rutas para guardar archivos
    const { folioPath } = getPaths()
    const procesadoPath = path.join(folioPath, 'PROCESADO')

    // Crear carpetas si no existen
    if (!fs.existsSync(folioPath)) {
      fs.mkdirSync(folioPath, { recursive: true })
    }
    if (!fs.existsSync(procesadoPath)) {
      fs.mkdirSync(procesadoPath, { recursive: true })
    }

    // Procesar cada CAF
    for (const cafItem of cafs) {
      try {
        const {
          id: cafId,
          tipo_documento_id: documentoId,
          folio_desde: desde,
          folio_hasta: hasta,
          folios_disponibles: disponibles,
          fecha_autorizacion: autorizacion,
          ambiente,
          activo,
          xml: xmlBase64
        } = cafItem

        // Calcular ultimo_usado desde folios_disponibles
        const totalFolios = hasta - desde + 1
        const ultimoUsado = desde + (totalFolios - disponibles) - 1

        // Validar que el XML base64 existe
        if (!xmlBase64) {
          addLog('error', `CAF sin contenido XML (tipo ${documentoId}). Campos recibidos: ${Object.keys(cafItem).join(', ')}`)
          continue
        }

        // Decodificar XML del CAF
        const xmlContent = Buffer.from(xmlBase64, 'base64').toString('utf8')

        // Parsear XML para extraer datos del CAF
        const reMatch = xmlContent.match(/<RE>([^<]+)<\/RE>/)
        const rsMatch = xmlContent.match(/<RS>([^<]+)<\/RS>/)
        const tdMatch = xmlContent.match(/<TD>([^<]+)<\/TD>/)
        const dMatch = xmlContent.match(/<D>([^<]+)<\/D>/)
        const hMatch = xmlContent.match(/<H>([^<]+)<\/H>/)
        const faMatch = xmlContent.match(/<FA>([^<]+)<\/FA>/)
        const mMatch = xmlContent.match(/<M>([^<]+)<\/M>/)
        const eMatch = xmlContent.match(/<E>([^<]+)<\/E>/)
        const idkMatch = xmlContent.match(/<IDK>([^<]+)<\/IDK>/)
        const frmaMatch = xmlContent.match(/<FRMA[^>]*>([^<]+)<\/FRMA>/)
        const rsaskMatch = xmlContent.match(/<RSASK>([^<]+)<\/RSASK>/)
        const rsapubkMatch = xmlContent.match(/<RSAPUBK>([^<]+)<\/RSAPUBK>/)

        if (!reMatch || !tdMatch || !dMatch || !hMatch) {
          addLog('warning', `CAF incompleto para tipo ${documentoId}`)
          continue
        }

        const cafData = {
          fol_nombre: `CAF_${documentoId}_${desde}-${hasta}.xml`,
          fol_re: reMatch[1],
          fol_rs: rsMatch ? rsMatch[1] : reMatch[1],
          fol_td: tdMatch[1],
          fol_rng_d: dMatch[1],
          fol_rng_h: hMatch[1],
          fol_fa: faMatch ? faMatch[1] : '',
          fol_rsapk_m: mMatch ? mMatch[1] : '',
          fol_rsapk_e: eMatch ? eMatch[1] : '',
          fol_idk: idkMatch ? idkMatch[1] : '',
          fol_frma: frmaMatch ? frmaMatch[1] : '',
          fol_rsask: rsaskMatch ? rsaskMatch[1] : '',
          fol_rsapubk: rsapubkMatch ? rsapubkMatch[1] : '',
          org_rut: configuredRut.replace('-', '')
        }

        // Verificar si ya existe en BD (usando nombres de columnas en MAYÚSCULAS)
        const [existing] = await connection.execute(
          'SELECT FOL_NOMBRE FROM folio WHERE ORG_RUT = ? AND FOL_TD = ? AND FOL_RNG_D = ? AND FOL_RNG_H = ?',
          [cafData.org_rut, cafData.fol_td, cafData.fol_rng_d, cafData.fol_rng_h]
        )

        if (existing.length > 0) {
          addLog('info', `CAF ya existe: Tipo ${documentoId} (${desde}-${hasta}), saltando...`)
          cafUpdated++
          continue
        }

        // Insertar en MySQL (usando nombres de columnas en MAYÚSCULAS)
        try {
          await connection.execute(
            `INSERT INTO folio (FOL_NOMBRE, FOL_RE, FOL_RS, FOL_TD, FOL_RNG_D, FOL_RNG_H, FOL_FA, FOL_RSAPK_M, FOL_RSAPK_E, FOL_IDK, FOL_FRMA, FOL_RSASK, FOL_RSAPUBK, ORG_RUT)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cafData.fol_nombre,
              cafData.fol_re,
              cafData.fol_rs,
              cafData.fol_td,
              cafData.fol_rng_d,
              cafData.fol_rng_h,
              cafData.fol_fa,
              cafData.fol_rsapk_m,
              cafData.fol_rsapk_e,
              cafData.fol_idk,
              cafData.fol_frma,
              cafData.fol_rsask,
              cafData.fol_rsapubk,
              cafData.org_rut
            ]
          )

          // Guardar archivo XML local
          const localFilePath = path.join(procesadoPath, cafData.fol_nombre)
          fs.writeFileSync(localFilePath, xmlContent, 'utf8')

          addLog('success', `✅ CAF insertado: Tipo ${documentoId} (${desde}-${hasta}), disponibles: ${disponibles}`)
          cafCount++

        } catch (dbError) {
          if (dbError.code === 'ER_DUP_ENTRY') {
            addLog('info', `CAF duplicado: Tipo ${documentoId}, saltando...`)
            cafUpdated++
          } else {
            addLog('error', `Error insertando CAF tipo ${documentoId}: ${dbError.message}`)
          }
        }

      } catch (fileError) {
        addLog('error', `Error procesando CAF: ${fileError.message}`)
      }
    }

    const totalMsg = cafCount > 0
      ? `${cafCount} CAF nuevos instalados, ${cafUpdated} ya existían`
      : `${cafUpdated} CAF verificados, todos actualizados`

    addLog('success', `✅ Sincronización completada: ${totalMsg}`)
    return { success: true, message: totalMsg, count: cafCount, updated: cafUpdated }

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message
    addLog('error', `❌ Error sincronizando CAF: ${errorMsg}`)
    return { success: false, message: errorMsg }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Enviar email de notificación
async function sendEmailNotification(subject, message, details = {}) {
  if (!store.get('emailNotifications')) {
    addLog('info', 'Email de notificación omitido (notificaciones desactivadas)')
    return // Emails desactivados
  }

  addLog('info', 'Intentando enviar email de notificación...')

  try {
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      host: store.get('smtpHost'),
      port: store.get('smtpPort'),
      secure: false,
      auth: {
        user: store.get('smtpUser'),
        pass: store.get('smtpPass')
      }
    })

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header iGlobal -->
        <div style="background: linear-gradient(135deg, #337ab7 0%, #2d6ba3 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">iGlobal</h1>
          <p style="color: #e6f2f9; margin: 5px 0 0 0; font-size: 14px;">Sistema de Gestión de DTE</p>
        </div>

        <!-- Contenido principal -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">${subject}</h2>
            <p style="color: #991b1b; margin: 0; font-size: 14px;">${message}</p>
          </div>

          <!-- Detalles del error -->
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Detalles del Documento</h3>
            ${details.fileName ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">📄 Archivo:</span>
                <span style="color: #111827; font-size: 14px; font-family: 'Courier New', monospace; background: #fff; padding: 4px 8px; border-radius: 4px; display: inline-block;">${details.fileName}</span>
              </div>
            ` : ''}
            ${details.folio ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">🔢 Folio:</span>
                <span style="color: #111827; font-size: 14px; font-weight: 600;">${details.folio}</span>
              </div>
            ` : ''}
            ${details.retries ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">🔄 Intentos realizados:</span>
                <span style="color: #dc2626; font-size: 14px; font-weight: 600;">${details.retries}</span>
              </div>
            ` : ''}
            ${details.error ? `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 4px;">⚠️ Error técnico:</span>
                <code style="color: #dc2626; font-size: 12px; background: #fff; padding: 8px; border-radius: 4px; display: block; overflow-x: auto;">${details.error}</code>
              </div>
            ` : ''}
          </div>

          <!-- Acción recomendada -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>💡 Acción recomendada:</strong><br>
              El archivo ha sido movido a la carpeta FALLIDOS. Revisa la conexión al API y vuelve a intentar procesarlo manualmente.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
            Este es un email automático enviado por <strong>iGlobal DTE Client</strong>
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            Empresa: ${store.get('rut')} | Fecha: ${new Date().toLocaleString('es-CL', {
              dateStyle: 'long',
              timeStyle: 'short'
            })}
          </p>
        </div>
      </div>
    `

    // Asunto con nombre del archivo
    const emailSubject = details.fileName
      ? `[iGlobal DTE] ${subject} - ${details.fileName}`
      : `[iGlobal DTE] ${subject}`

    await transporter.sendMail({
      from: store.get('emailFrom'),
      to: store.get('emailTo'),
      subject: emailSubject,
      html: htmlContent
    })

    addLog('success', 'Email de notificación enviado')
  } catch (error) {
    addLog('warning', `No se pudo enviar email: ${error.message}`)
  }
}

// Normalizar texto a ASCII puro (sin tildes ni caracteres especiales)
// C# usaba ASCIIEncoding que solo permite caracteres 0-127
// Los caracteres > 127 (tildes, ñ, etc.) deben convertirse a equivalentes ASCII
function normalizarTextoASCII(texto) {
  // Mapa de caracteres especiales a ASCII
  const mapaASCII = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'ü': 'u', 'Ü': 'U',
    'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
    'À': 'A', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U',
    'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
    'Â': 'A', 'Ê': 'E', 'Î': 'I', 'Ô': 'O', 'Û': 'U',
    'ç': 'c', 'Ç': 'C'
  }

  // Reemplazar cada carácter no-ASCII (> 127) con su equivalente ASCII
  return texto.replace(/[^\x00-\x7F]/g, char => mapaASCII[char] || '')
}

// Generar PDF417 del TED (usando TED generado desde MySQL, no del XML)
// IMPORTANTE: Esta función lanza error si falla, para que el proceso principal lo capture
async function generatePDF417FromTED(xmlFilePath, tedContent, fileName) {
  if (!store.get('generatePDF417')) {
    return // PDF417 desactivado
  }

  const { pngPath } = getPaths()

  // Crear carpeta PNG si no existe
  if (!fs.existsSync(pngPath)) {
    fs.mkdirSync(pngPath, { recursive: true })
  }

  // Generar PDF417 usando bwip-js según especificaciones SII Chile
  // Ref: A.2.5 Reglas Para La Generación e Impresión Del Timbre PDF417
  //
  // NOTA IMPORTANTE sobre la codificación:
  // El sistema C# legacy usaba ASCIIEncoding que solo acepta caracteres 0-127.
  // Los caracteres con tildes (á, é, í, ó, ú, ñ) son > 127 y deben convertirse
  // a sus equivalentes ASCII sin tilde (a, e, i, o, u, n).
  //
  // MySQL NO está aplicando esta normalización, por lo que debemos hacerlo aquí.
  const tedASCII = normalizarTextoASCII(tedContent)

  const pngBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',           // Tipo de código de barras
    text: tedASCII,           // TED normalizado a ASCII puro (sin tildes)

    // Especificaciones SII:
    eclevel: 5,               // Error Correction Level 5 (requerido por SII)
    columns: 12,              // Número de columnas de datos

    // Dimensiones según SII:
    // X Dim mínimo: 6.7 mils = 0.17018 mm
    // Y Dim: 3:1 ratio con X = 20.1 mils = 0.51054 mm
    // Para 300 DPI: 1 mil = 0.0254 mm, 1 pixel a 300dpi = 0.0846667 mm
    width: 7,                 // X dimension en mils (ancho de barra más angosta) - mínimo 6.7
    height: 21,               // Y dimension en mils (altura de fila) - ratio 3:1

    // Configuración de renderizado:
    scale: 3,                 // Escala de píxeles (multiplicador)
    includetext: false,       // Sin texto visible debajo
    parsefnc: false,          // No parsear caracteres especiales FNC
    inkspread: 0,             // Sin compensación de expansión de tinta
    backgroundcolor: 'ffffff' // Fondo blanco para quiet zone
  })

  // Guardar PNG con el nombre base del archivo XML
  const baseFileName = path.basename(fileName, '.xml')
  const pngFilePath = path.join(pngPath, `${baseFileName}.png`)
  fs.writeFileSync(pngFilePath, pngBuffer)

  addLog('success', `PDF417 generado: ${baseFileName}.png (${pngBuffer.length} bytes)`)
}

// Procesador de cola - procesa archivos uno por uno
async function processQueueWorker() {
  if (isProcessingQueue) {
    return // Ya hay un worker procesando
  }

  isProcessingQueue = true

  try {
    while (processingQueue.length > 0) {
      const filePath = processingQueue.shift()

      // Verificar que el archivo no fue ya procesado por otro worker
      if (!fs.existsSync(filePath)) {
        addLog('info', `Archivo ya procesado, saltando: ${path.basename(filePath)}`)
        continue
      }

      await processXMLFile(filePath)
    }
  } catch (error) {
    addLog('error', `Error en worker de procesamiento: ${error.message}`)
  } finally {
    isProcessingQueue = false
  }
}

// Agregar archivo a la cola de procesamiento
function enqueueFile(filePath) {
  const fileName = path.basename(filePath)

  // Evitar duplicados en la cola
  if (processingQueue.includes(filePath)) {
    addLog('info', `Archivo ya está en cola: ${fileName}`)
    return
  }

  processingQueue.push(filePath)
  addLog('info', `Archivo agregado a cola (${processingQueue.length} en espera): ${fileName}`)

  // Iniciar procesamiento de la cola
  processQueueWorker()
}

// Procesar archivo XML localmente (generar PDF417 y mover a PENDING)
async function processXMLFile(filePath) {
  const fileName = path.basename(filePath)

  try {
    addLog('info', `Procesando archivo localmente: ${fileName}`)

    // Verificar que el archivo aún existe
    if (!fs.existsSync(filePath)) {
      addLog('warning', `El archivo ya no existe: ${fileName}`)
      return { success: false, error: 'Archivo no existe' }
    }

    // Verificar tamaño del archivo para asegurar que está completamente escrito
    let fileSize = fs.statSync(filePath).size
    await new Promise(resolve => setTimeout(resolve, 100)) // Esperar 100ms
    let newFileSize = fs.statSync(filePath).size

    // Si el tamaño cambió, el archivo aún se está escribiendo
    if (fileSize !== newFileSize) {
      addLog('info', `Archivo aún se está escribiendo: ${fileName}, esperando...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Leer contenido del XML con encoding ISO-8859-1 (correcto para DTEs chilenos)
    let xmlContent
    try {
      const xmlBuffer = fs.readFileSync(filePath)
      xmlContent = iconv.decode(xmlBuffer, 'ISO-8859-1')
    } catch (readError) {
      throw new Error(`No se pudo leer el archivo: ${readError.message}`)
    }

    // Validar que el XML no está vacío
    if (!xmlContent || xmlContent.trim().length === 0) {
      throw new Error('El archivo XML está vacío')
    }

    // Extraer información básica del XML
    const rutMatch = xmlContent.match(/<RUTEmisor>([^<]+)<\/RUTEmisor>/)
    const tipoDTEMatch = xmlContent.match(/<TipoDTE>([^<]+)<\/TipoDTE>/)
    const folioMatch = xmlContent.match(/<Folio>([^<]+)<\/Folio>/)

    const rut = rutMatch ? rutMatch[1] : store.get('rut')
    const tipoDTE = tipoDTEMatch ? tipoDTEMatch[1] : ''
    const folio = folioMatch ? folioMatch[1] : ''

    // Obtener rutas dinámicas
    const { processedPath, pendingPath, failedPath } = getPaths()

    // Validación: si es documento 802, moverlo directamente a PROCESADO (igual que C#)
    if (tipoDTE === '802') {
      addLog('info', `Documento 802 detectado, moviendo a PROCESADO sin subir: ${fileName}`)

      if (!fs.existsSync(processedPath)) {
        fs.mkdirSync(processedPath, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
      const processedFilePath = path.join(processedPath, `${path.basename(fileName, '.xml')}_${timestamp}.xml`)
      fs.renameSync(filePath, processedFilePath)

      return { success: true, fileName, skipped: true }
    }

    // Generar TED desde MySQL para el PDF417 (igual que C#)
    addLog('info', `Generando TED y PDF417: ${fileName}`)
    const tedData = await generateTED(xmlContent, rut, tipoDTE, folio)

    if (!tedData) {
      throw new Error('No se pudo generar el TED para PDF417')
    }

    // Generar PDF417 usando el TED generado (ANTES de mover)
    await generatePDF417FromTED(filePath, tedData.TED, fileName)

    // Mover XML a carpeta PENDING (esperando subida)
    // Crear carpeta PENDING si no existe
    if (!fs.existsSync(pendingPath)) {
      fs.mkdirSync(pendingPath, { recursive: true })
    }

    const pendingFilePath = path.join(pendingPath, fileName)
    fs.renameSync(filePath, pendingFilePath)

    addLog('success', `XML procesado y movido a PENDING: ${fileName}`)

    return { success: true, fileName, folio }

  } catch (error) {
    addLog('error', `Error procesando XML localmente: ${fileName} - ${error.message}`)

    // Si hay error al procesar, mover a FALLIDOS
    const { failedPath } = getPaths()

    if (!fs.existsSync(failedPath)) {
      fs.mkdirSync(failedPath, { recursive: true })
    }

    const failedFilePath = path.join(failedPath, fileName)

    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, failedFilePath)
      addLog('warning', `Archivo movido a FALLIDOS: ${fileName}`)
    }

    // Enviar email de notificación por fallo en procesamiento
    // Intentar extraer folio del XML (puede estar disponible aunque falle el procesamiento)
    let folio = 'N/A'
    try {
      const xmlBuffer = fs.readFileSync(failedFilePath)
      const xmlContent = iconv.decode(xmlBuffer, 'ISO-8859-1')
      const folioMatch = xmlContent.match(/<Folio>([^<]+)<\/Folio>/)
      folio = folioMatch ? folioMatch[1] : 'N/A'
    } catch (readError) {
      // Si no se puede leer, mantener folio como N/A
    }

    await sendEmailNotification(
      'Error al procesar XML',
      `No se pudo procesar el archivo ${fileName}. El archivo ha sido movido a la carpeta FALLIDOS.`,
      {
        fileName: fileName,
        folio: folio,
        error: error.message,
        retries: 1
      }
    )

    return { success: false, error: error.message, fileName }
  }
}

// Subir archivos desde PENDING con reintentos
async function uploadPendingFiles() {
  // Evitar ejecuciones concurrentes
  if (isUploadingPending) {
    addLog('info', 'Ya hay una subida en progreso, saltando...')
    return
  }

  isUploadingPending = true

  try {
    const { pendingPath } = getPaths()

    // Verificar que la carpeta PENDING existe
    if (!fs.existsSync(pendingPath)) {
      return
    }

    // Obtener todos los archivos XML en PENDING
    const files = fs.readdirSync(pendingPath).filter(f => f.endsWith('.xml'))

    if (files.length === 0) {
      return
    }

    addLog('info', `Iniciando subida de ${files.length} archivo(s) desde PENDING`)

    for (const fileName of files) {
      // Verificar que el archivo aún existe (pudo ser procesado por otra instancia)
      const filePath = path.join(pendingPath, fileName)
      if (!fs.existsSync(filePath)) {
        addLog('info', `Archivo ya procesado, saltando: ${fileName}`)
        continue
      }

      await uploadSingleFile(fileName, 0)
    }

    addLog('success', 'Proceso de subida completado')
  } catch (error) {
    addLog('error', `Error en proceso de subida: ${error.message}`)
  } finally {
    isUploadingPending = false
  }
}

// Subir un archivo individual desde PENDING con reintentos
async function uploadSingleFile(fileName, retryCount = 0) {
  const { pendingPath, sentPath, failedPath } = getPaths()
  const filePath = path.join(pendingPath, fileName)
  const maxRetries = store.get('maxRetries')

  try {
    if (retryCount > 0) {
      addLog('info', `Reintento ${retryCount}/${maxRetries} para: ${fileName}`)
    } else {
      addLog('info', `Subiendo archivo: ${fileName}`)
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      addLog('warning', `Archivo no encontrado en PENDING: ${fileName}`)
      return { success: false, error: 'Archivo no existe' }
    }

    // Leer contenido del XML completo con encoding ISO-8859-1
    const xmlBuffer = fs.readFileSync(filePath)
    const xmlContent = iconv.decode(xmlBuffer, 'ISO-8859-1')

    // Extraer información básica para logs
    const folioMatch = xmlContent.match(/<Folio>([^<]+)<\/Folio>/)
    const folio = folioMatch ? folioMatch[1] : 'N/A'

    // Validar que existe el Bearer Token
    const apiToken = store.get('apiToken')
    if (!apiToken || apiToken.trim().length === 0) {
      throw new Error('Bearer Token no configurado. Configure el token en Ajustes.')
    }

    // Enviar al API Laravel v2
    let apiUrl = store.get('apiUrl')

    // Reemplazar localhost por 127.0.0.1 para forzar IPv4
    apiUrl = apiUrl.replace('localhost', '127.0.0.1')

    // Convertir XML a base64 para evitar problemas de codificación
    const xmlBase64 = xmlBuffer.toString('base64')

    // Extraer fecha_timbre del nombre del archivo si existe
    // Formato: DTE_RUT_TIPO_FOLIO_YYYY-MM-DDTHHMMSS.xml
    // Ejemplo: DTE_78191021K_33_40_2024-12-01T112854.xml → "2024-12-01T11:28:54"
    let fechaTimbre = null
    const partes = path.basename(fileName, '.xml').split('_')
    if (partes.length >= 5) {
      const ts = partes[4]
      const match = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})$/)
      if (match) {
        fechaTimbre = `${match[1]}T${match[2]}:${match[3]}:${match[4]}`
        addLog('info', `Fecha timbre extraída: ${fechaTimbre}`)
      }
    }

    // Construir payload
    const payload = { xml_content: xmlBase64 }
    if (fechaTimbre) {
      payload.fecha_timbre = fechaTimbre
    }

    // Enviar el XML en base64 junto con fecha_timbre
    const response = await axios.post(
      apiUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000, // 30 segundos
        family: 4 // Forzar IPv4
      }
    )

    // API responde con 202 Accepted en caso de éxito
    if (response.status === 202 || response.data.success) {
      const empresaInfo = response.data.data?.empresa_razon_social || 'N/A'
      addLog('success', `XML enviado exitosamente: ${fileName} (Folio: ${folio}) - ${empresaInfo}`)

      // Mover a carpeta SENT (enviados)
      if (!fs.existsSync(sentPath)) {
        fs.mkdirSync(sentPath, { recursive: true })
      }

      const sentFilePath = path.join(sentPath, fileName)
      fs.renameSync(filePath, sentFilePath)

      addLog('info', `Archivo movido a SENT: ${fileName}`)

      return { success: true, fileName, folio, empresa: empresaInfo }
    } else {
      throw new Error(response.data.message || 'Error desconocido del API')
    }

  } catch (error) {
    let errorMessage = error.message
    let httpStatus = error.response?.status

    // Extraer mensaje de error del API si está disponible
    if (error.response?.data) {
      const apiError = error.response.data

      // Log completo de la respuesta del API para debugging
      addLog('error', `Respuesta completa del API: ${JSON.stringify(apiError, null, 2)}`)

      if (apiError.message) {
        errorMessage = apiError.message
      }
      // Si hay errores de validación, agregarlos
      if (apiError.errors) {
        const validationErrors = Object.values(apiError.errors).flat().join(', ')
        errorMessage += ` - Validación: ${validationErrors}`
      }
      // Si hay detalles adicionales (trace, exception, etc.)
      if (apiError.error) {
        errorMessage += ` - Detalles: ${apiError.error}`
      }
      if (apiError.exception) {
        errorMessage += ` - Exception: ${apiError.exception}`
      }
    }

    // Detectar errores de red (sin conexión)
    const isNetworkError =
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ENETUNREACH' ||
      error.code === 'EAI_AGAIN' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network')

    // Detectar errores que NO deben reintentar (configuración incorrecta)
    const isConfigError = httpStatus === 401 || httpStatus === 403

    // Errores de configuración (401 Unauthorized, 403 Forbidden) - mover a FALLIDOS inmediatamente
    if (isConfigError) {
      addLog('error', `Error de autenticación/autorización: ${errorMessage}`)

      // Crear carpeta FALLIDOS si no existe
      if (!fs.existsSync(failedPath)) {
        fs.mkdirSync(failedPath, { recursive: true })
      }

      const failedFilePath = path.join(failedPath, fileName)

      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, failedFilePath)
        addLog('warning', `Archivo movido a FALLIDOS: ${fileName}`)
      }

      // Extraer folio para notificación con encoding ISO-8859-1
      const xmlBuffer = fs.readFileSync(failedFilePath)
      const xmlContent = iconv.decode(xmlBuffer, 'ISO-8859-1')
      const folioMatch = xmlContent.match(/<Folio>([^<]+)<\/Folio>/)
      const folio = folioMatch ? folioMatch[1] : 'N/A'

      await sendEmailNotification(
        httpStatus === 401 ? 'Error de autenticación' : 'Error de autorización',
        `${errorMessage}. Archivo: ${fileName}`,
        {
          fileName: fileName,
          folio: folio,
          error: errorMessage,
          retries: 1
        }
      )

      return { success: false, error: errorMessage, fileName, movedToFailed: true, configError: true }
    }

    // Detectar errores de conexión
    if (isNetworkError) {
      if (retryCount === 0) {
        addLog('warning', `Sin conexión al API. El archivo ${fileName} permanecerá en PENDING`)
      }

      // Si aún quedan reintentos para errores de red, reintentar
      if (retryCount < maxRetries) {
        const retryDelay = store.get('retryDelay')
        addLog('info', `Reintentando conexión en ${retryDelay / 1000}s... (${retryCount + 1}/${maxRetries + 1})`)

        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return uploadSingleFile(fileName, retryCount + 1)
      }

      // Si agotamos reintentos por error de red, NO mover a FALLIDOS
      // Mantener en PENDING para intentar en el próximo ciclo
      addLog('warning', `No se pudo conectar al API después de ${maxRetries + 1} intentos. ${fileName} permanece en PENDING`)
      return { success: false, error: errorMessage, fileName, keptInPending: true }
    }

    // Para errores de validación (422) u otros errores del API
    // Si aún quedan reintentos, intentar de nuevo (puede ser temporal)
    if (retryCount < maxRetries) {
      const retryDelay = store.get('retryDelay')
      addLog('warning', `Error del API para ${fileName}. Reintentando en ${retryDelay / 1000}s...`)

      await new Promise(resolve => setTimeout(resolve, retryDelay))
      return uploadSingleFile(fileName, retryCount + 1)
    }

    // Ya no quedan reintentos - mover a carpeta FALLIDOS (error real del API)
    addLog('error', `Error definitivo del API para ${fileName}: ${errorMessage}`)

    // Crear carpeta FALLIDOS si no existe
    if (!fs.existsSync(failedPath)) {
      fs.mkdirSync(failedPath, { recursive: true })
    }

    const failedFilePath = path.join(failedPath, fileName)

    // Verificar que el archivo aún existe antes de moverlo
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, failedFilePath)
      addLog('warning', `Archivo movido a FALLIDOS: ${fileName}`)
    }

    // Enviar email de notificación con encoding ISO-8859-1
    const xmlBuffer = fs.readFileSync(failedFilePath)
    const xmlContent = iconv.decode(xmlBuffer, 'ISO-8859-1')
    const folioMatch = xmlContent.match(/<Folio>([^<]+)<\/Folio>/)
    const folio = folioMatch ? folioMatch[1] : 'N/A'

    await sendEmailNotification(
      'Error al subir XML',
      `No se pudo enviar el archivo ${fileName} después de ${maxRetries + 1} intentos.`,
      {
        fileName: fileName,
        folio: folio,
        error: errorMessage,
        retries: maxRetries + 1
      }
    )

    return { success: false, error: errorMessage, fileName, movedToFailed: true }
  }
}

// Iniciar file watcher
function startWatcher() {
  // Validar que el RUT esté configurado
  const rut = store.get('rut')
  if (!rut || rut.trim() === '') {
    addLog('error', 'No se puede iniciar: Debes configurar el RUT de la empresa primero')
    return false
  }

  const { watchPath, processedPath, failedPath, pendingPath, sentPath, pngPath, folioPath } = getPaths()

  // Crear todas las carpetas necesarias si no existen
  const carpetas = [watchPath, processedPath, failedPath, pendingPath, sentPath, pngPath, folioPath]
  for (const carpeta of carpetas) {
    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true })
      addLog('info', `Carpeta creada: ${carpeta}`)
    }
  }

  if (watcher) {
    addLog('warning', 'El watcher ya está activo')
    return false
  }

  try {
    watcher = chokidar.watch(watchPath, {
      ignored: [
        /(^|[\/\\])\../, // ignorar archivos ocultos
        '**/PROCESADO/**', // ignorar carpeta PROCESADO
        '**/FALLIDOS/**', // ignorar carpeta FALLIDOS
        '**/PENDING/**', // ignorar carpeta PENDING
        '**/SENT/**' // ignorar carpeta SENT
      ],
      persistent: true,
      ignoreInitial: false,
      depth: 0, // solo monitorear archivos en la raíz, no subdirectorios
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })

    watcher
      .on('add', (filePath) => {
        if (path.extname(filePath).toLowerCase() === '.xml') {
          addLog('info', `Nuevo XML detectado: ${path.basename(filePath)}`)
          enqueueFile(filePath)
        }
      })
      .on('error', (error) => {
        addLog('error', `Error en watcher: ${error.message}`)
      })

    addLog('success', `Watcher iniciado en: ${watchPath}`)
    store.set('watcherEnabled', true)
    updateTrayMenu() // Actualizar menú del tray

    // Iniciar intervalo de subida desde PENDING (cada 2 minutos por defecto)
    const intervalTime = store.get('uploadInterval')
    uploadInterval = setInterval(() => {
      uploadPendingFiles()
    }, intervalTime)

    addLog('info', `Intervalo de subida iniciado (cada ${intervalTime / 1000}s)`)

    // Ejecutar primera subida inmediatamente
    uploadPendingFiles()

    // Sincronizar CAF al iniciar
    if (store.get('cafEnabled')) {
      addLog('info', 'Sincronizando CAF al iniciar watcher...')
      syncCAFFromAPI()

      // Iniciar intervalo de sincronización de CAF (cada 1 hora)
      cafSyncInterval = setInterval(() => {
        addLog('info', 'Sincronización automática de CAF (cada 1 hora)')
        syncCAFFromAPI()
      }, 3600000) // 1 hora = 3600000ms

      addLog('info', 'Intervalo de sincronización CAF iniciado (cada 1 hora)')
    }

    // Notificar a la ventana del cambio de estado
    if (mainWindow) {
      mainWindow.webContents.send('watcher-status-changed', true)
    }

    return true

  } catch (error) {
    addLog('error', `Error iniciando watcher: ${error.message}`)
    return false
  }
}

// Detener file watcher
function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    addLog('info', 'Watcher detenido')
    store.set('watcherEnabled', false)
    updateTrayMenu() // Actualizar menú del tray

    // Detener intervalo de subida
    if (uploadInterval) {
      clearInterval(uploadInterval)
      uploadInterval = null
      addLog('info', 'Intervalo de subida detenido')
    }

    // Detener intervalo de sincronización CAF
    if (cafSyncInterval) {
      clearInterval(cafSyncInterval)
      cafSyncInterval = null
      addLog('info', 'Intervalo de sincronización CAF detenido')
    }

    // Limpiar cola de procesamiento
    if (processingQueue.length > 0) {
      addLog('info', `Limpiando cola de procesamiento (${processingQueue.length} archivos pendientes)`)
      processingQueue = []
    }

    // Notificar a la ventana del cambio de estado
    if (mainWindow) {
      mainWindow.webContents.send('watcher-status-changed', false)
    }

    return true
  }
  return false
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  const paths = getPaths()

  return {
    apiUrl: store.get('apiUrl'),
    apiToken: store.get('apiToken'),
    basePath: store.get('basePath'),
    rut: store.get('rut'),
    // Rutas dinámicas calculadas
    watchPath: paths.watchPath,
    processedPath: paths.processedPath,
    failedPath: paths.failedPath,
    pendingPath: paths.pendingPath,
    sentPath: paths.sentPath,
    pngPath: paths.pngPath,
    folioPath: paths.folioPath,
    autoStart: store.get('autoStart'),
    watcherEnabled: watcher !== null, // Estado real del watcher
    generatePDF417: store.get('generatePDF417'),
    uploadInterval: store.get('uploadInterval'),
    // Configuración MySQL
    mysqlHost: store.get('mysqlHost'),
    mysqlPort: store.get('mysqlPort'),
    mysqlUser: store.get('mysqlUser'),
    mysqlPassword: store.get('mysqlPassword'),
    mysqlDatabase: store.get('mysqlDatabase'),
    // Configuración CAF desde API
    cafEnabled: store.get('cafEnabled'),
    // Configuración Email
    emailNotifications: store.get('emailNotifications'),
    emailTo: store.get('emailTo'),
    emailFrom: store.get('emailFrom'),
    smtpHost: store.get('smtpHost'),
    smtpPort: store.get('smtpPort'),
    smtpUser: store.get('smtpUser'),
    smtpPass: store.get('smtpPass'),
    maxRetries: store.get('maxRetries'),
    retryDelay: store.get('retryDelay')
  }
})

ipcMain.handle('set-config', (event, config) => {
  store.set(config)
  addLog('success', 'Configuración guardada')
  return { success: true }
})

ipcMain.handle('start-watcher', () => {
  return { success: startWatcher() }
})

ipcMain.handle('stop-watcher', () => {
  return { success: stopWatcher() }
})

ipcMain.handle('get-logs', () => {
  return logs
})

ipcMain.handle('sync-caf', async () => {
  return await syncCAFFromAPI()
})

// Handler: Sincronizar información de empresa desde API a MySQL local
ipcMain.handle('sync-empresa', async () => {
  try {
    const apiToken = store.get('apiToken')
    const rut = store.get('rut')

    if (!apiToken || !rut) {
      return { success: false, message: 'Configura el Bearer Token y el RUT primero' }
    }

    // Construir URL del endpoint empresa desde la URL del API
    let apiUrl = store.get('apiUrl')
    const baseUrl = apiUrl.replace(/\/api\/v1\/documentos.*$/, '')
    const empresaUrl = `${baseUrl}/api/v1/empresa`.replace('localhost', '127.0.0.1')

    addLog('info', `Sincronizando empresa desde: ${empresaUrl}`)

    // Obtener empresa desde API Laravel
    const response = await axios.get(empresaUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      },
      timeout: 30000,
      family: 4
    })

    if (!response.data || !response.data.empresa) {
      return { success: false, message: 'El API no retornó datos de empresa' }
    }

    const empresa = response.data.empresa

    // Conectar a MySQL local
    const connection = await mysql.createConnection({
      host: store.get('mysqlHost'),
      port: store.get('mysqlPort'),
      user: store.get('mysqlUser'),
      password: store.get('mysqlPassword'),
      database: store.get('mysqlDatabase')
    })

    // Preparar RUT sin guión para la columna ORG_RUT
    const rutSinGuion = rut.replace('-', '')

    // Verificar si la empresa ya existe
    const [existing] = await connection.execute(
      'SELECT ORG_RUT FROM empresa WHERE ORG_RUT = ?',
      [rutSinGuion]
    )

    if (existing.length > 0) {
      // Actualizar empresa existente
      await connection.execute(
        `UPDATE empresa SET
          ORG_NOMBRE = ?, org_direccion = ?, ORG_FONO = ?, ORG_MAIL = ?,
          ORG_WEBSITE = ?, ORG_GIRO = ?, ORG_REPRESENTANTE = ?,
          ORG_REPRESENTANTE_RUT = ?, ORG_CIUDAD = ?, ORG_COMUNA = ?,
          ORG_ACTIVIDAD = ?, ORG_FECHA_RESOL = ?, ORG_NRO_RESOL = ?,
          ORG_OFICINA_SII = ?, ORG_RAZON_IMPRESO = ?
        WHERE ORG_RUT = ?`,
        [
          empresa.nombre || '',
          empresa.direccion || '',
          empresa.fono || '',
          empresa.mail || '',
          empresa.website || '',
          empresa.giro || '',
          empresa.representante || '',
          empresa.representante_rut || '',
          empresa.ciudad || '',
          empresa.comuna || '',
          empresa.actividad || '',
          empresa.fecha_resolucion || '',
          empresa.nro_resolucion || '',
          empresa.oficina_sii || '',
          empresa.razon_impreso || empresa.nombre || '',
          rutSinGuion
        ]
      )
      addLog('success', `✅ Empresa actualizada: ${empresa.nombre}`)
    } else {
      // Insertar empresa nueva
      await connection.execute(
        `INSERT INTO empresa (ORG_RUT, ORG_NOMBRE, org_direccion, ORG_FONO, ORG_MAIL,
          ORG_WEBSITE, ORG_GIRO, ORG_REPRESENTANTE, ORG_REPRESENTANTE_RUT,
          ORG_CIUDAD, ORG_COMUNA, ORG_ACTIVIDAD, ORG_FECHA_RESOL, ORG_NRO_RESOL,
          ORG_OFICINA_SII, ORG_RAZON_IMPRESO, ORG_SUCURSAL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rutSinGuion,
          empresa.nombre || '',
          empresa.direccion || '',
          empresa.fono || '',
          empresa.mail || '',
          empresa.website || '',
          empresa.giro || '',
          empresa.representante || '',
          empresa.representante_rut || '',
          empresa.ciudad || '',
          empresa.comuna || '',
          empresa.actividad || '',
          empresa.fecha_resolucion || '',
          empresa.nro_resolucion || '',
          empresa.oficina_sii || '',
          empresa.razon_impreso || empresa.nombre || '',
          '0'
        ]
      )
      addLog('success', `✅ Empresa insertada: ${empresa.nombre}`)
    }

    await connection.end()
    return { success: true, message: `Empresa sincronizada: ${empresa.nombre}` }

  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message
    addLog('error', `❌ Error sincronizando empresa: ${errorMsg}`)
    return { success: false, message: errorMsg }
  }
})

ipcMain.handle('upload-pending', async () => {
  addLog('info', 'Subida manual de archivos PENDING solicitada')
  await uploadPendingFiles()
  return { success: true, message: 'Proceso de subida completado' }
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('test-api', async (event, apiUrl, apiToken) => {
  try {
    // Construir URL del health check
    const baseUrl = apiUrl.replace(/\/api\/v1\/documentos.*$/, '')

    // Reemplazar localhost por 127.0.0.1 para forzar IPv4
    const healthUrl = `${baseUrl}/api/health`.replace('localhost', '127.0.0.1')

    addLog('info', `Probando conexión a: ${healthUrl}`)

    const response = await axios.get(healthUrl, {
      timeout: 5000,
      // Forzar IPv4
      family: 4
    })

    if (response.data.status === 'ok') {
      const version = response.data.version || 'N/A'
      addLog('success', `API conectado correctamente (v${version})`)
      return { success: true, message: `API conectado correctamente (v${version})` }
    } else {
      addLog('warning', 'API respondió pero con estado incorrecto')
      return { success: false, message: 'API respondió pero con estado incorrecto' }
    }
  } catch (error) {
    addLog('error', `Error probando API: ${error.message}`)
    return { success: false, message: error.message }
  }
})

// Handler: Probar conexión MySQL
ipcMain.handle('test-mysql', async (event, config) => {
  try {
    addLog('info', `Probando conexión MySQL: ${config.user}@${config.host}:${config.port}/${config.database}`)

    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    })

    // Probar conexión simple
    await connection.execute('SELECT 1')

    // Cerrar conexión
    await connection.end()

    addLog('success', `Conexión MySQL exitosa a ${config.database}`)
    return { success: true, message: `Conexión exitosa a base de datos "${config.database}"` }
  } catch (error) {
    addLog('error', `Error conectando a MySQL: ${error.message}`)

    // Mensajes más amigables según el tipo de error
    let friendlyMessage = error.message
    if (error.code === 'ECONNREFUSED') {
      friendlyMessage = 'No se puede conectar al servidor MySQL. Verifica que esté corriendo.'
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      friendlyMessage = 'Usuario o contraseña incorrectos'
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      friendlyMessage = `La base de datos "${config.database}" no existe`
    }

    return { success: false, message: friendlyMessage }
  }
})

// ============================================
// AUTO-UPDATER CONFIGURATION
// ============================================

// Configurar auto-updater
autoUpdater.autoDownload = false // No descargar automáticamente
autoUpdater.autoInstallOnAppQuit = true // Instalar al cerrar

// Logs del auto-updater
autoUpdater.on('checking-for-update', () => {
  addLog('info', '🔍 Verificando actualizaciones...')
})

autoUpdater.on('update-available', (info) => {
  addLog('success', `✨ Nueva versión disponible: ${info.version}`)

  // Preguntar al usuario si quiere descargar
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización Disponible',
      message: `Una nueva versión está disponible: ${info.version}`,
      detail: '¿Deseas descargar e instalar la actualización ahora? La aplicación se reiniciará después de la instalación.',
      buttons: ['Descargar Ahora', 'Más Tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        addLog('info', '📥 Descargando actualización...')
        autoUpdater.downloadUpdate()
      } else {
        addLog('info', 'Actualización pospuesta. Se instalará al cerrar la aplicación.')
      }
    })
  }
})

autoUpdater.on('update-not-available', () => {
  addLog('info', '✅ La aplicación está actualizada')
})

autoUpdater.on('error', (err) => {
  addLog('error', `Error en auto-actualización: ${err.message}`)
})

autoUpdater.on('download-progress', (progressObj) => {
  const percent = Math.round(progressObj.percent)
  addLog('info', `📥 Descargando actualización: ${percent}%`)
})

autoUpdater.on('update-downloaded', (info) => {
  addLog('success', `✅ Actualización descargada: ${info.version}`)

  // Preguntar si quiere instalar ahora
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización Lista',
      message: 'La actualización ha sido descargada.',
      detail: '¿Deseas reiniciar la aplicación ahora para instalar la actualización?',
      buttons: ['Reiniciar Ahora', 'Más Tarde'],
      defaultId: 0,
      cancelId: 1
    }).then(result => {
      if (result.response === 0) {
        addLog('info', '🔄 Reiniciando aplicación para instalar actualización...')
        autoUpdater.quitAndInstall(false, true)
      } else {
        addLog('info', 'La actualización se instalará al cerrar la aplicación.')
      }
    })
  }
})

// App ready
app.whenReady().then(() => {
  createWindow()
  createTray()

  // Verificar actualizaciones al iniciar (solo en producción)
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 5000) // Esperar 5 segundos después de iniciar
  }

  // Sincronizar CAF al iniciar la aplicación (si está habilitado)
  if (store.get('cafEnabled')) {
    addLog('info', '🔄 Sincronizando CAF al iniciar aplicación...')
    syncCAFFromAPI().then(result => {
      if (result.success) {
        addLog('success', `CAF sincronizado: ${result.message}`)
      } else {
        addLog('warning', `No se pudo sincronizar CAF: ${result.message}`)
      }
    }).catch(error => {
      addLog('error', `Error sincronizando CAF al inicio: ${error.message}`)
    })
  }
})

app.on('window-all-closed', (event) => {
  // No cerrar la app en Windows cuando se cierran todas las ventanas
  // La app seguirá corriendo en el system tray
  event.preventDefault()
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (watcher) {
    watcher.close()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
