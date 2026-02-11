@echo off
echo ==========================================
echo Reset Password - Development Tool
echo ==========================================
echo.
echo Este script eliminara la contrasena guardada
echo para simular una primera instalacion.
echo.
pause

set CONFIG_PATH=%APPDATA%\dte-client\config.json

if exist "%CONFIG_PATH%" (
    echo Eliminando configuracion de contrasena...
    del "%CONFIG_PATH%"
    echo.
    echo [OK] Contrasena reseteada exitosamente!
    echo.
    echo Ahora puedes iniciar la aplicacion y veras
    echo el modal de primera instalacion.
) else (
    echo.
    echo [INFO] No se encontro archivo de configuracion.
    echo La app ya se comportara como primera instalacion.
)

echo.
pause
