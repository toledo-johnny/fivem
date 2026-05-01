@echo off
setlocal EnableExtensions
title Bot Discord - Inicializacao

if /i "%~1" neq "__keep_open__" (
  echo %cmdcmdline% | findstr /i /c:" /c " >nul
  if not errorlevel 1 (
    cmd /k call "%~f0" __keep_open__
    exit /b %errorlevel%
  )
)

cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd nao foi encontrado. Instale o Node.js 18+.
  pause
  exit /b 1
)

if not exist package.json (
  echo package.json nao encontrado em %cd%.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dependencias nao encontradas. Rode npm.cmd install antes de iniciar o bot.
  pause
  exit /b 1
)

echo Iniciando bot-discord...
npm.cmd start
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo O bot foi encerrado com codigo %EXIT_CODE%.
  echo Se a mensagem acima citar a porta 3050 em uso, feche a instancia antiga do bot antes de iniciar outra.
  pause
)

exit /b %EXIT_CODE%
