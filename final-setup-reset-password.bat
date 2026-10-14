@echo off
REM Navigate to the old directory where Python and Node are accessible
cd /d D:\03_Study\Desktop\old

REM Try to run the Python script
echo Creating reset-password directory and files...
python execute-create-reset-password.py

if errorlevel 1 (
    echo Python script failed, trying Node.js...
    node create-reset-password-files.js
)

echo.
echo Setup complete! The reset-password directory has been created.
echo Location: D:\03_Study\Desktop\old\frontend\src\pages\reset-password
pause
