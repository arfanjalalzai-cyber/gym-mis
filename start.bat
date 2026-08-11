@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_URL=http://127.0.0.1:8000"
set "FRONTEND_URL=http://localhost:5173"

title Gym MIS Launcher
echo Starting Gym MIS...
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo Python was not found. Please install Python or add it to PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found. Please install Node.js or add it to PATH.
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%\manage.py" (
    echo Backend manage.py was not found: "%BACKEND_DIR%\manage.py"
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo Frontend package.json was not found: "%FRONTEND_DIR%\package.json"
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing frontend packages. This may take a few minutes...
    pushd "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 (
        popd
        echo Frontend package installation failed.
        pause
        exit /b 1
    )
    popd
)

echo Starting backend at %BACKEND_URL% ...
start "Gym MIS Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && python manage.py runserver 127.0.0.1:8000"

echo Starting frontend at %FRONTEND_URL% ...
start "Gym MIS Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev -- --host 127.0.0.1"

echo Opening browser...
timeout /t 5 /nobreak >nul
start "" "%FRONTEND_URL%"

echo.
echo Gym MIS is starting.
echo Keep the Backend and Frontend windows open while using the system.
pause
