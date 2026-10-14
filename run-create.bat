@echo off
REM Navigate to the script directory
cd /d D:\03_Study\Desktop\old

REM Try to run with node
if exist create-reset-password-script.js (
    echo Running Node.js script...
    node create-reset-password-script.js
    if errorlevel 1 (
        echo Failed to run Node script
        exit /b 1
    )
) else (
    echo Script not found
    exit /b 1
)

echo Complete!
