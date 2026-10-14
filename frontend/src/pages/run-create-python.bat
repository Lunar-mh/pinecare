@echo off
setlocal enabledelayedexpansion
cd /d "D:\03_Study\Desktop\old\frontend\src\pages"

echo Running Python script to create reset-password files...
python create-reset-password.py

if errorlevel 1 (
    echo Error occurred while running the script
    pause
    exit /b 1
) else (
    echo.
    echo Files created successfully! You can close this window.
    timeout /t 2
)
