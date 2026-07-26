@echo off
REM Start script for MYNTRA project - MongoDB, Backend, and Frontend

echo.
echo ===== MYNTRA Development Setup =====
echo.

REM Check if MongoDB is running
echo Checking MongoDB connection...
netstat -ano | findstr ":27017" >nul
if errorlevel 1 (
    echo.
    echo [WARNING] MongoDB is NOT running on port 27017!
    echo.
    echo To start MongoDB:
    echo 1. Open a new Command Prompt/PowerShell
    echo 2. Run: mongod
    echo.
    echo Or see SETUP_MONGODB.md for installation instructions.
    echo.
    pause
) else (
    echo [OK] MongoDB is running
)

echo.
echo Starting Backend Server...
echo.

set ROOT_DIR=%~dp0
set VENV_PYTHON=%ROOT_DIR%.venv\Scripts\python.exe
if exist "%VENV_PYTHON%" (
    set PYTHON_EXEC=%VENV_PYTHON%
) else (
    set PYTHON_EXEC=python
)

cd /d "%ROOT_DIR%backend"
"%PYTHON_EXEC%" server.py

pause
