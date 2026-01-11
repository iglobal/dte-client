# iGlobal DTE Client

Cliente de escritorio moderno para el procesamiento automatizado de Documentos Tributarios Electrónicos (DTE) chilenos.

**Stack:** Electron 28 + Vue 3 + TypeScript + Tailwind CSS

---

## Descripción

iGlobal DTE Client es una aplicación de escritorio que automatiza el procesamiento de documentos tributarios electrónicos (DTE) en Chile. Monitorea carpetas locales, procesa archivos XML de DTEs, y se sincroniza con sistemas backend para mantener la información tributaria actualizada.

---

## Características Principales

- **Monitoreo Automático**: Detecta nuevos archivos XML de DTEs en carpetas configuradas
- **Procesamiento en Tiempo Real**: Envía automáticamente los documentos al sistema backend
- **Gestión de CAF**: Sincronización automática de folios CAF desde el servidor
- **Notificaciones por Email**: Alertas automáticas ante errores o eventos importantes
- **Sistema Tray**: Opera en segundo plano sin interrumpir el trabajo
- **Auto-actualización**: Se mantiene actualizado automáticamente con nuevas versiones
- **Logs Detallados**: Registro completo de todas las operaciones
- **Interfaz Moderna**: UI intuitiva construida con Vue 3 y Tailwind CSS

---

## Descarga e Instalación

### Para Usuarios Finales

1. Descarga el instalador más reciente desde [Releases](https://github.com/iglobal/dte-client/releases)
2. Ejecuta `iGlobal DTE Client Setup X.X.X.exe`
3. Sigue las instrucciones del instalador
4. La aplicación se iniciará automáticamente después de la instalación

### Actualizaciones

La aplicación verifica automáticamente nuevas versiones. Cuando hay una actualización disponible:
- Recibirás una notificación
- Podrás descargar e instalar con un solo clic
- O verificar manualmente desde el menú del system tray

---

## Uso

### Primera Configuración

Al iniciar la aplicación por primera vez, configura:

1. **API URL**: Dirección del servidor backend
2. **Token de API**: Token de autenticación proporcionado
3. **RUT Empresa**: RUT de la empresa a procesar
4. **Carpeta de Monitoreo**: Ruta donde se generan los XMLs de DTEs
5. **Email (Opcional)**: Para recibir notificaciones de errores

### Operación Diaria

1. Inicia el monitoreo haciendo clic en "Iniciar"
2. La aplicación detectará automáticamente nuevos XMLs
3. Los documentos se procesarán y enviarán al servidor
4. Los archivos procesados se moverán a la carpeta `PROCESADO/`
5. Los archivos con errores se moverán a la carpeta `FALLIDOS/`

### Minimizar a System Tray

- Al cerrar la ventana, la aplicación continúa en el system tray
- Click derecho en el ícono del tray para acceder a opciones
- Puedes detener el monitoreo, verificar actualizaciones o salir completamente

---

## Tecnologías

- **Electron 28**: Framework multiplataforma para aplicaciones de escritorio
- **Vue 3**: Framework progresivo de JavaScript para la interfaz
- **TypeScript**: Tipado estático para mayor confiabilidad
- **Tailwind CSS**: Framework de CSS para diseño moderno
- **Chokidar**: Monitoreo eficiente del sistema de archivos
- **Axios**: Cliente HTTP para comunicación con el API
- **electron-updater**: Sistema de auto-actualización
- **electron-store**: Almacenamiento persistente de configuración

---

## Estructura del Proyecto

```
dte-client/
├── electron/              # Proceso principal de Electron
│   ├── main.js           # Lógica principal, file watcher, API
│   └── preload.js        # Bridge IPC seguro
├── src/                  # Frontend Vue 3
│   ├── App.vue           # Componente raíz
│   ├── components/       # Componentes de UI
│   └── types/            # Definiciones TypeScript
├── public/               # Assets estáticos
└── package.json          # Dependencias y scripts
```

---

## Desarrollo

### Prerrequisitos

- Node.js 18 o superior
- npm 9 o superior
- Windows 10/11 (para build)

### Instalación Local

```bash
git clone https://github.com/iglobal/dte-client.git
cd dte-client
npm install
```

### Ejecutar en Desarrollo

```bash
npm run electron:dev
```

### Compilar para Producción

```bash
npm run build
```

El instalador se generará en la carpeta `dist/`

---

## Solución de Problemas

### La aplicación no detecta XMLs

- Verifica que la carpeta de monitoreo esté correctamente configurada
- Asegúrate de que la aplicación esté en modo "Iniciado" (botón verde)
- Revisa los logs para errores específicos

### Error de conexión con el API

- Verifica que la URL del API sea correcta
- Confirma que el token de autenticación sea válido
- Asegúrate de tener conexión a internet

### Los archivos quedan en FALLIDOS

- Revisa los logs para ver el motivo específico del error
- Verifica que los XMLs tengan el formato correcto
- Confirma que el RUT configurado coincida con el del XML

### La aplicación no se actualiza

- Verifica tu conexión a internet
- Puedes descargar manualmente desde GitHub Releases
- Contacta al soporte técnico si el problema persiste

---

## Licencia

GNU Affero General Public License v3.0 (AGPL-3.0)

Este software es de código abierto bajo la licencia AGPL-3.0. Consulta el archivo LICENSE para más detalles.

---

## Soporte

Para reportar problemas o solicitar nuevas funcionalidades, por favor crea un [Issue](https://github.com/iglobal/dte-client/issues) en GitHub.

---

**Desarrollado con ❤️ para iGlobal**
