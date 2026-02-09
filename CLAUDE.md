# iGlobal DTE Client Electron - Documentación Completa para Claude

> **Propósito de este documento**: Contexto exhaustivo del proyecto para futuras conversaciones con Claude.
> **Última actualización**: 2026-02-08

---

## 1. RESUMEN EJECUTIVO

### ¿Qué es este proyecto?

**iGlobal DTE Client** es una aplicación de escritorio para Windows que automatiza el procesamiento de Documentos Tributarios Electrónicos (DTE) en Chile.

**Funcionalidad principal**:
- Monitorea carpetas locales en busca de archivos XML de DTEs
- Procesa y valida estos documentos
- Genera códigos de barras PDF417 a partir del TED (Timbre Electrónico)
- Sube documentos a un backend Laravel mediante API REST
- Gestiona archivos CAF (Códigos de Autorización de Folios)
- Envía notificaciones por email en caso de errores
- Proporciona actualizaciones automáticas

**Contexto empresarial**: Esta aplicación actúa como puente entre sistemas ERP locales y la plataforma cloud de gestión de DTEs de iGlobal, automatizando todo el flujo de facturación electrónica conforme a las especificaciones del SII (Servicio de Impuestos Internos de Chile).

**Versión actual**: 1.0.10

---

## 2. ARQUITECTURA TÉCNICA

### Stack Tecnológico

**Frontend (Proceso Renderer)**:
- Vue 3.4.15 (Composition API)
- TypeScript 5.3.3
- Tailwind CSS 3.4.1
- Vite 6.4.1

**Backend (Proceso Main)**:
- Electron 35.7.5
- Node.js (embedded)
- Dependencias clave:
  - `chokidar 3.5.3` - Monitoreo del sistema de archivos
  - `axios 1.6.5` - Cliente HTTP
  - `mysql2 3.16.0` - Cliente MySQL
  - `electron-store 8.1.0` - Almacenamiento persistente
  - `electron-updater 6.1.7` - Actualizaciones automáticas
  - `bwip-js 4.1.0` - Generación de códigos de barras PDF417
  - `nodemailer 7.0.13` - Notificaciones por email

### Arquitectura Multi-Proceso de Electron

```
┌─────────────────────────────────────────────────────────────┐
│                  PROCESO MAIN (Node.js)                     │
│                   electron/main.js (1804 líneas)            │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ File Watcher    │  │ MySQL Client │  │  API Client    │ │
│  │ (Chokidar)      │  │ (mysql2)     │  │  (Axios)       │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ TED Generator   │  │ PDF417 Gen   │  │ Email Client   │ │
│  │ (Crypto/RSA)    │  │ (bwip-js)    │  │ (Nodemailer)   │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Auto-Updater    │  │ System Tray  │  │ Config Store   │ │
│  └─────────────────┘  └──────────────┘  └────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    IPC (contextBridge)
                           │
┌──────────────────────────┴──────────────────────────────────┐
│               PROCESO RENDERER (Chromium)                   │
│                      Vue 3 App                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Dashboard   │  │  Logs View   │  │  Settings View   │  │
│  │  (App.vue)   │  │  Component   │  │  (654 líneas)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        Tailwind CSS + iGlobal Brand Colors             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Estructura de Directorios

```
C:\Projects\dte-client-electron\
│
├── electron/                     # Proceso Main de Electron
│   ├── main.js                   # Lógica principal (1804 líneas)
│   │   - Monitoreo de archivos con chokidar
│   │   - Procesamiento y validación de XML
│   │   - Generación de TED y códigos de barras PDF417
│   │   - Comunicación con API Laravel
│   │   - Integración con base de datos MySQL (ERP)
│   │   - Sincronización de CAF
│   │   - Notificaciones por email
│   │   - Sistema de actualizaciones automáticas
│   │   - Integración con bandeja del sistema
│   └── preload.js                # Puente IPC seguro
│
├── src/                          # Frontend Vue 3
│   ├── App.vue                   # Componente principal
│   │   - Dashboard con estado en tiempo real
│   │   - Notificaciones toast
│   │   - Navegación por pestañas (Dashboard/Logs/Settings)
│   │   - Controles del watcher
│   ├── components/
│   │   ├── LogsView.vue          # Historial completo de logs con filtrado
│   │   └── SettingsView.vue      # Interfaz de configuración (654 líneas)
│   │       - Configuración de conexión API
│   │       - Configuración MySQL
│   │       - Sincronización de CAF
│   │       - Configuración SMTP de email
│   │       - Gestión de rutas
│   ├── main.ts                   # Punto de entrada de Vue
│   ├── style.css                 # Estilos globales + imports de Tailwind
│   └── types/
│       └── electron.d.ts         # Definiciones TypeScript para IPC
│
├── public/                       # Assets estáticos
│   ├── icon.png                  # Icono de aplicación
│   └── icon.ico                  # Icono del instalador Windows
│
├── dist/                         # Build de producción (instalador)
├── dist-renderer/                # Frontend Vue compilado
│
├── Archivos de Configuración
├── package.json                  # Dependencias, scripts, config electron-builder
├── vite.config.ts                # Configuración de Vite
├── tsconfig.json                 # Opciones del compilador TypeScript
├── tailwind.config.js            # Tema de Tailwind (colores iGlobal)
├── postcss.config.js             # PostCSS para Tailwind
├── index.html                    # Punto de entrada HTML
├── .gitignore                    # Reglas de Git ignore
├── .env.local                    # Token de GitHub para releases (NO commiteado)
│
├── Documentación
├── README.md                     # Documentación de usuario (español)
├── API-LARAVEL-SPECS.md          # Especificaciones de la API Laravel
├── INSTALLATION.md               # Guía de instalación
├── COMO-PUBLICAR-NUEVA-VERSION.md # Guía de publicación de releases
├── AUTO-UPDATE-SETUP.md          # Guía de configuración de auto-update
│
└── Scripts de Build
    ├── publish.bat               # Script batch para releases
    ├── publish.ps1               # Script PowerShell para releases
    └── publish-fixed.bat         # Script alternativo de publicación
```

---

## 3. FLUJOS DE TRABAJO PRINCIPALES

### A. Procesamiento de Archivos XML (Flujo Completo)

```
1. Usuario coloca XML en carpeta monitoreada (C:\iGlobal\{RUT}\XML\)
   │
   ↓
2. Chokidar detecta nuevo archivo
   │
   ↓
3. Archivo añadido a cola de procesamiento (previene acceso concurrente)
   │
   ↓
4. XML parseado y validado (encoding ISO-8859-1)
   │
   ↓
5. Extracción: RUT, TipoDTE, Folio
   │
   ↓
6. Verificar si es tipo de documento 802 (manejo especial, skip upload)
   │
   ↓
7. Generar TED (Timbre Electrónico):
   - Consultar CAF desde MySQL
   - Construir DD (Datos a firmar)
   - Firmar con clave privada RSA
   - Crear código de barras PDF417 (PNG)
   │
   ↓
8. Mover XML a carpeta PENDING
   │
   ↓
9. Intervalo de subida se activa (cada 30 segundos)
   │
   ↓
10. Subir a API Laravel:
    - Convertir XML a Base64
    - Enviar con Bearer Token
    - Incluir fecha_timbre extraída
   │
   ↓
11a. ÉXITO (202) → Mover a carpeta SENT
11b. ERROR DE RED → Reintentar (máx 3 veces), mantener en PENDING
11c. ERROR AUTH/VALIDACIÓN (401/403/422) → Mover a FALLIDOS, enviar email
```

**Ubicación del código**: `electron/main.js:712-1200`

### B. Sincronización de CAF (Códigos de Autorización de Folios)

```
1. Activado al iniciar app O manualmente desde configuración
   │
   ↓
2. Llamada API a /api/v1/caf (con Bearer Token)
   │
   ↓
3. Recibir lista de CAF (XML codificado en Base64)
   │
   ↓
4. Para cada CAF:
   - Decodificar Base64 a XML
   - Parsear: RE, RS, TD, D, H, FA, FRMA, RSASK, etc.
   - Verificar si ya existe en MySQL
   │
   ↓
5. Insertar en tabla MySQL `folio` (si es nuevo)
   │
   ↓
6. Guardar archivo XML localmente en FOLIO/PROCESADO/
   │
   ↓
7. Auto-sincronización cada 1 hora mientras watcher está activo
```

**Ubicación del código**: `electron/main.js:500-650`

### C. Generación de TED (Timbre Electrónico Digital)

Proceso criptográfico complejo:

1. **Extracción de datos del XML**: RUT, Folio, Fecha, Monto Total, Items, etc.
2. **Consulta de CAF desde MySQL**: Por RUT + TipoDTE + rango de Folio
3. **Construcción del DD** (Data to be Digitally signed):
   - Incluye metadatos del documento
   - Embebe clave pública y firma del CAF
   - Normaliza caracteres especiales a ASCII (ñ → n, á → a)
4. **Firma del DD**: Con clave privada RSA del CAF (SHA1withRSA)
5. **Generación de código de barras PDF417**:
   - Encoding: ASCII puro (sin UTF-8, sin Latin-1)
   - Nivel de corrección de errores: 5
   - Columnas: 12
   - Dimensiones según specs del SII (6.7 mils X, 20.1 mils Y)
6. **Guardado del PNG** en carpeta designada

**Ubicación del código**: `electron/main.js:850-1050`

**Consideraciones especiales**:
- Mapeo de caracteres: á→a, é→e, í→i, ó→o, ú→u, ñ→n
- Coincide con comportamiento del sistema legacy en C#
- Crítico para validación del SII

### D. Sistema de Reintentos y Manejo de Errores

**Errores de red** (Conexión rechazada, timeout):
- Reintentar hasta 3 veces (configurable)
- Delay de 10 segundos entre reintentos
- Mantener en carpeta PENDING
- Se reintentará en siguiente ciclo de subida

**Errores determinísticos** (401, 403, 422):
- SIN reintentos
- Mover inmediatamente a FALLIDOS
- Enviar notificación por email
- Registrar mensaje de error detallado

**Errores de procesamiento** (CAF faltante, XML inválido):
- Mover a FALLIDOS inmediatamente
- Enviar notificación por email
- No se intenta subida a API

**Ubicación del código**: `electron/main.js:1100-1350`

---

## 4. API LARAVEL - ENDPOINTS ESPERADOS

### POST /api/v1/documentos

**Propósito**: Subir archivos XML de DTE

**Headers**:
```
Authorization: Bearer {token-64-caracteres}
Content-Type: application/json
```

**Body**:
```json
{
  "xml_content": "base64_encoded_xml",
  "fecha_timbre": "2024-12-01T11:28:54"  // opcional, extraído del nombre de archivo
}
```

**Respuesta exitosa (202 Accepted)**:
```json
{
  "success": true,
  "data": {
    "empresa_razon_social": "Nombre de la Empresa"
  }
}
```

**Respuestas de error**:
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Permisos insuficientes
- `422 Unprocessable Entity`: Validación fallida
- `500 Internal Server Error`: Error del servidor

### GET /api/v1/caf

**Propósito**: Descargar archivos CAF

**Headers**:
```
Authorization: Bearer {token}
```

**Respuesta**:
```json
{
  "cafs": [
    {
      "id": 1,
      "tipo_documento_id": 33,
      "folio_desde": 1,
      "folio_hasta": 100,
      "folios_disponibles": 50,
      "fecha_autorizacion": "2024-01-01",
      "ambiente": "produccion",
      "activo": true,
      "xml": "base64_encoded_xml"
    }
  ],
  "empresa": {
    "razon_social": "Nombre de la Empresa"
  }
}
```

### GET /api/v1/empresa

**Propósito**: Descargar información de empresa para MySQL local

**Headers**: `Authorization: Bearer {token}`

**Respuesta**: Detalles de empresa (nombre, dirección, RUT, etc.)

### GET /api/health

**Propósito**: Health check de la API

**Respuesta**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

**Documentación completa**: Ver `API-LARAVEL-SPECS.md`

---

## 5. ESQUEMA DE BASE DE DATOS MYSQL

### Tabla: `folio` (Almacenamiento de CAF)

```sql
CREATE TABLE folio (
  FOL_NOMBRE VARCHAR(255),     -- Nombre del archivo CAF
  FOL_RE VARCHAR(20),          -- RUT Emisor
  FOL_RS VARCHAR(255),         -- Razón Social
  FOL_TD VARCHAR(10),          -- Tipo Documento
  FOL_RNG_D INT,               -- Inicio rango de folios
  FOL_RNG_H INT,               -- Fin rango de folios
  FOL_FA DATE,                 -- Fecha Autorización
  FOL_RSAPK_M TEXT,            -- Módulo de clave pública RSA
  FOL_RSAPK_E TEXT,            -- Exponente de clave pública RSA
  FOL_IDK TEXT,                -- ID de clave
  FOL_FRMA TEXT,               -- Firma
  FOL_RSASK TEXT,              -- Clave privada RSA (PEM)
  FOL_RSAPUBK TEXT,            -- Clave pública RSA (PEM)
  ORG_RUT VARCHAR(20)          -- RUT de organización (sin guión)
);
```

### Tabla: `empresa` (Información de empresa)

```sql
CREATE TABLE empresa (
  ORG_RUT VARCHAR(20),
  ORG_NOMBRE VARCHAR(255),
  org_direccion VARCHAR(255),
  ORG_FONO VARCHAR(50),
  ORG_MAIL VARCHAR(255),
  -- ... más campos
);
```

**Conexión**: Configurada desde `SettingsView.vue`, almacenada en `electron-store`

**Uso**: Consultas durante generación de TED para obtener CAF y datos de empresa

---

## 6. CONFIGURACIÓN Y ALMACENAMIENTO PERSISTENTE

### electron-store Configuration

**Ubicación**: `C:\Users\{user}\AppData\Roaming\dte-client\config.json`

**Estructura completa**:
```javascript
{
  // Configuración de API
  apiUrl: 'http://localhost:8000/api/v1/documentos',
  apiToken: '', // Token Bearer de 64 caracteres

  // Rutas del sistema de archivos
  basePath: 'C:\\iGlobal',
  rut: '', // RUT de empresa (formato 76123456-7)
  // Rutas dinámicas generadas: {basePath}\{rut}\XML, PNG, FOLIO

  // Comportamiento
  autoStart: true,
  watcherEnabled: false,
  generatePDF417: true,
  uploadInterval: 30000, // 30 segundos
  maxRetries: 3,
  retryDelay: 10000, // 10 segundos

  // MySQL (Conexión ERP)
  mysqlHost: 'localhost',
  mysqlPort: 3306,
  mysqlUser: 'root',
  mysqlPassword: '',
  mysqlDatabase: 'iglobal_dte',

  // Sincronización CAF
  cafEnabled: true,
  folioPath: 'C:\\iGlobal\\RUT_EMPRESA\\FOLIO',

  // Notificaciones por Email
  emailNotifications: false,
  emailTo: '',
  emailFrom: 'dte-client@iglobal.cl',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: ''
}
```

### Estructura de Carpetas Dinámica

Creada automáticamente según configuración:

```
C:\iGlobal\{RUT}\
├── XML\                  # Carpeta monitoreada (archivos nuevos detectados aquí)
│   ├── PENDING\          # Procesados localmente, esperando subida
│   ├── SENT\             # Subidos exitosamente a API
│   ├── PROCESADO\        # Carpeta legacy (documentos tipo 802)
│   └── FALLIDOS\         # Subidas fallidas después de reintentos
├── PNG\                  # Códigos de barras PDF417 generados
└── FOLIO\                # Archivos CAF
    └── PROCESADO\        # XMLs de CAF descargados
```

**Código de creación**: `electron/main.js:150-250`

---

## 7. SISTEMA DE ACTUALIZACIONES AUTOMÁTICAS

### Mecanismo

- Usa **electron-updater** con GitHub Releases
- Verifica actualizaciones 5 segundos después del inicio (solo en producción)
- Verificación manual vía menú contextual de bandeja del sistema
- Descarga actualización en segundo plano
- Solicita al usuario instalar (o instala al cerrar app)
- Lee desde archivo `latest.yml` en GitHub Releases

### Workflow de Publicación

1. Actualizar `version` en package.json (ej: `"1.0.10"`)
2. Configurar `GH_TOKEN` en `.env.local` (Personal Access Token de GitHub)
3. Ejecutar script `publish.bat`
4. Script compila instalador y sube a GitHub Releases
5. Clientes auto-detectan nueva versión y solicitan actualización

**Configuración**: Ver `COMO-PUBLICAR-NUEVA-VERSION.md` y `AUTO-UPDATE-SETUP.md`

**Código**: `electron/main.js:80-140`

---

## 8. SEGURIDAD

### Medidas Implementadas

✅ **Seguridad IPC**:
- `contextIsolation: true`
- `nodeIntegration: false`
- Puente seguro vía `contextBridge`

✅ **Autenticación API**:
- Bearer Token (64 caracteres)
- Almacenado en electron-store (encriptado por SO)
- Enviado con cada request API

✅ **Credenciales MySQL**:
- Almacenadas en electron-store
- Usadas solo en proceso main (sin acceso desde renderer)

✅ **Token de GitHub**:
- Almacenado en `.env.local`
- NO commiteado al repositorio (en .gitignore)
- Usado solo para publicación de releases

### Riesgos Potenciales

⚠️ **Datos sensibles en electron-store**:
- Almacenados como JSON plano en AppData
- Encriptación a nivel de SO depende de cuenta de usuario Windows
- Considerar encriptar campos sensibles (password MySQL, password SMTP)

⚠️ **Claves privadas RSA**:
- Claves privadas de CAF almacenadas en MySQL
- Usadas para firma de TED
- Asegurar que acceso a MySQL esté restringido

⚠️ **Exposición de token API**:
- Token de 64 caracteres otorga acceso completo a API
- Sin mecanismo de rotación de token
- Considerar implementar lógica de refresh de token

---

## 9. CONSIDERACIONES DE CODIFICACIÓN DE CARACTERES

**Crítico para funcionalidad correcta**:

### XML Files
- **Lectura**: ISO-8859-1 (estándar DTE chileno)
- **Código**: `electron/main.js:780`
- **Biblioteca**: `iconv-lite`

### Generación de TED
- **Convertir a ASCII puro** (7-bit)
- **Mapeo de caracteres especiales**:
  - á → a, é → e, í → i, ó → o, ú → u
  - ñ → n
  - Ü → U, ü → u
- **Razón**: Coincidir con comportamiento de sistema legacy en C#
- **Código**: `electron/main.js:920-950`

### Subida a API
- **Encoding Base64** para evitar problemas de encoding
- **Código**: `electron/main.js:1180`

---

## 10. COMANDOS DE DESARROLLO

### Desarrollo

```bash
npm run dev                  # Solo servidor dev de Vite
npm run electron             # Solo Electron con URL de Vite
npm run electron:dev         # Ambos simultáneamente (recomendado)
```

### Build de Producción

```bash
npm run build                # Build Vue + crear instalador
npm run dist                 # Solo crear instalador (después de build)
npm run pack                 # Crear directorio desempaquetado (testing)
```

### Publicación

```bash
# En Windows
publish.bat                  # Publica a GitHub Releases

# O manualmente
npm run build
npm run publish              # Requiere GH_TOKEN en .env.local
```

---

## 11. PATRONES DE DISEÑO UTILIZADOS

1. **IPC (Inter-Process Communication)** - Puente seguro vía `contextBridge` en preload.js
2. **Patrón Observer** - Actualizaciones de logs en tiempo real desde main a renderer
3. **Patrón Cola** - Procesamiento secuencial de archivos XML para evitar conflictos
4. **Patrón Retry** - Lógica de reintentos automáticos para subidas fallidas (configurable)
5. **State Management** - `electron-store` para configuración persistente
6. **Arquitectura Event-Driven** - Watcher de archivos Chokidar emite eventos
7. **UI Basada en Componentes** - Componentes de archivo único de Vue 3

---

## 12. CARACTERÍSTICAS ESPECIALES

### A. Integración con Bandeja del Sistema

- Minimiza a bandeja en lugar de cerrar
- Menú contextual clic derecho:
  - Mostrar aplicación
  - Iniciar/Detener monitoreo (toggle)
  - Verificar actualizaciones
  - Salir de aplicación
- Tooltip muestra estado actual (Activo/Inactivo)
- Notificación balloon al minimizar por primera vez

**Código**: `electron/main.js:200-280`

### B. Manejo de Documento Tipo 802

Caso especial: Documentos tipo 802 (documento tributario chileno específico):
- Detectado durante procesamiento
- Movido directamente a PROCESADO
- Omite toda lógica de subida
- Sin generación de PDF417
- Sin comunicación con API

**Código**: `electron/main.js:830`

### C. Sistema de Notificaciones por Email

Envía emails formateados en HTML cuando:
- **Procesamiento de XML falla** (error generación PDF417, CAF faltante)
- **Subida falla después de reintentos máximos** (movido a FALLIDOS)
- **Errores de autenticación** (401/403/422)

Email incluye:
- Detalles del error
- Nombre de archivo y folio
- Número de intentos de reintento
- Plantilla HTML con marca iGlobal

**Código**: `electron/main.js:400-500`

---

## 13. OPTIMIZACIONES DE RENDIMIENTO

### Implementadas

1. **Procesamiento basado en cola**: Procesamiento secuencial de archivos previene condiciones de carrera
2. **Subida en lote**: Intervalos de 30 segundos reducen sobrecarga de API
3. **Rotación de logs**: Mantener solo últimos 100 logs en memoria
4. **Operaciones asíncronas**: I/O de archivos y llamadas de red son no-bloqueantes
5. **Límite de profundidad de carpeta**: Chokidar monitorea solo nivel raíz (depth: 0)
6. **Estabilización de escritura de archivos**: Delay de 2 segundos asegura escrituras completas

### Límites de Escalabilidad

- **Volumen de archivos**: Puede manejar volumen moderado (< 100 archivos/minuto)
- **Rate limiting de API**: Sin rate limiting integrado (depende del backend Laravel)
- **Conexiones MySQL**: Abre nueva conexión por consulta (sin pooling)
- **Memoria**: Logs limitados a 100, pero sin límite en cola de pendientes

### Cuellos de Botella Potenciales

1. Generación de TED (firma RSA intensiva en CPU)
2. Generación de PDF417 (CPU + memoria)
3. Velocidad de subida a API (latencia de red)
4. Sobrecarga de conexión MySQL (sin pooling)

---

## 14. INFORMACIÓN DE VERSIONES

**Versión actual**: 1.0.10

**Cambios recientes** (desde commits de git):
- `15c7548` - Mejorar mensajes de error del API para hacerlos más user-friendly
- `690406a` - Bump version to 1.0.9
- `5b17179` - Mover errores 422 a FALLIDOS inmediatamente sin reintentar
- `fbd0fcc` - Extraer y enviar fecha_timbre desde nombre del archivo XML
- `9b7b972` - Bump version to 1.0.8

**Licencia**: AGPL-3.0 (GNU Affero General Public License v3.0)

**Autor**: iGlobal

---

## 15. PUNTOS CLAVE PARA DESARROLLO FUTURO

### Fortalezas

✅ Arquitectura bien estructurada Electron + Vue
✅ Manejo completo de errores y lógica de reintentos
✅ UI profesional con Tailwind CSS
✅ Monitoreo robusto de archivos con Chokidar
✅ Implementación completa de auto-update
✅ Logging detallado y notificaciones
✅ Sistema de configuración flexible

### Áreas de Mejora

🔧 Añadir tests automatizados (unit, integration, e2e)
🔧 Implementar connection pooling de MySQL
🔧 Añadir rate limiting para requests API
🔧 Encriptar datos sensibles en electron-store
🔧 Añadir telemetría/analytics para tracking de errores
🔧 Implementar rotación de logs a archivo (no solo memoria)
🔧 Añadir soporte para Linux/macOS (actualmente solo Windows)
🔧 Añadir soporte de dark mode en UI
🔧 Implementar mecanismo de refresh de token
🔧 Añadir exportación CSV/Excel para logs

### Características Potenciales

💡 UI de procesamiento en lote (subida manual desde PENDING)
💡 Dashboard con estadísticas (documentos procesados, tasa de éxito, etc.)
💡 Soporte multi-idioma (actualmente solo español)
💡 Soporte multi-empresa (cambiar entre RUTs)
💡 Notificaciones webhook (alternativa a email)
💡 Integración con más sistemas ERP
💡 Backup en cloud de documentos procesados

---

## 16. ARCHIVOS CLAVE Y REFERENCIAS DE CÓDIGO

### Archivos Principales

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `electron/main.js` | 1804 | Proceso principal - toda la lógica backend |
| `src/components/SettingsView.vue` | 654 | Interfaz de configuración |
| `src/App.vue` | ~400 | Componente principal Vue - dashboard |
| `electron/preload.js` | ~150 | Puente IPC seguro |

### Referencias de Código Importantes

- **Monitoreo de archivos**: `electron/main.js:712-780`
- **Generación de TED**: `electron/main.js:850-1050`
- **Subida a API**: `electron/main.js:1100-1350`
- **Sincronización de CAF**: `electron/main.js:500-650`
- **Notificaciones por email**: `electron/main.js:400-500`
- **Auto-updater**: `electron/main.js:80-140`
- **Sistema de bandeja**: `electron/main.js:200-280`

---

## 17. SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "CAF no encontrado"

**Causa**: Falta CAF en MySQL para el tipo de documento y folio
**Solución**:
1. Verificar conexión MySQL en Settings
2. Ejecutar sincronización de CAF manualmente
3. Verificar que API retorna CAFs correctos

### Error: "Falló subida después de 3 reintentos"

**Causa**: Problemas de red o API caída
**Solución**:
1. Verificar URL de API en Settings
2. Verificar token de autenticación
3. Verificar que API Laravel esté funcionando (`/api/health`)

### Error: "Error de autenticación (401)"

**Causa**: Token inválido o expirado
**Solución**:
1. Verificar token en Settings
2. Generar nuevo token desde Laravel backend
3. Verificar que token tiene 64 caracteres

### Archivos no se procesan

**Causa**: Watcher no iniciado o ruta incorrecta
**Solución**:
1. Verificar que watcher esté activo (botón verde en dashboard)
2. Verificar basePath y RUT en Settings
3. Verificar que archivos están en carpeta correcta: `{basePath}\{rut}\XML\`

### PDF417 no se genera

**Causa**: Error en generación de TED o CAF faltante
**Solución**:
1. Verificar logs para mensaje de error específico
2. Verificar que `generatePDF417: true` en config
3. Verificar que CAF existe en MySQL

---

## 18. GLOSARIO DE TÉRMINOS

- **DTE**: Documento Tributario Electrónico (factura electrónica chilena)
- **TED**: Timbre Electrónico Digital (firma criptográfica en el DTE)
- **CAF**: Código de Autorización de Folios (autorización del SII para emitir DTEs)
- **SII**: Servicio de Impuestos Internos (autoridad tributaria de Chile)
- **Folio**: Número secuencial único del DTE
- **PDF417**: Tipo de código de barras 2D usado en DTEs chilenos
- **DD**: Datos a Digitalizar (datos a firmar en el TED)
- **RUT**: Rol Único Tributario (identificación tributaria en Chile)

---

## 19. CONTACTO Y RECURSOS

**Documentación adicional**:
- `README.md` - Guía de usuario
- `API-LARAVEL-SPECS.md` - Especificaciones completas de API
- `INSTALLATION.md` - Guía de instalación detallada

**Repositorio**: (privado)

**Soporte**: Contactar a iGlobal

---

**Fin del documento de contexto para Claude**
