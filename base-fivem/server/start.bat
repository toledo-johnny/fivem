@echo off
cd /d "%~dp0"
title FiveM Server - Inicializacao
setlocal EnableExtensions

if not exist "..\artifacts\FXServer.exe" (
  echo FXServer.exe nao encontrado em ..\artifacts
  exit /b 1
)

if not exist "server.cfg" (
  echo server.cfg nao encontrado em %cd%.
  exit /b 1
)

echo Iniciando base-fivem pelo FXServer...
..\artifacts\FXServer.exe +exec server.cfg
exit /b %errorlevel%
