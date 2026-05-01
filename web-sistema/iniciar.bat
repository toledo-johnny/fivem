@echo off
setlocal EnableExtensions
title Web Sistema - Inicializacao
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm.cmd nao foi encontrado. Instale o Node.js 18+.
  exit /b 1
)

if not exist package.json (
  echo package.json nao encontrado em %cd%.
  exit /b 1
)

if not exist node_modules (
  echo Dependencias nao encontradas. Rode npm.cmd install antes de iniciar o sistema web.
  exit /b 1
)

echo Iniciando web-sistema...
npm.cmd run dev
exit /b %errorlevel%
