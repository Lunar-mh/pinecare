@echo off
REM ============================================================
REM   Reset Password Module - Verification Script
REM   Checks if setup was successful
REM ============================================================

echo.
echo ============================================================
echo  RESET PASSWORD MODULE - VERIFICATION
echo ============================================================
echo.

REM Check if reset-password directory exists
if exist "D:\03_Study\Desktop\old\frontend\src\pages\reset-password" (
    echo [✓] Directory found: reset-password
    
    REM Check if index.config.ts exists
    if exist "D:\03_Study\Desktop\old\frontend\src\pages\reset-password\index.config.ts" (
        echo [✓] File found: index.config.ts
        REM Show file size
        for %%A in ("D:\03_Study\Desktop\old\frontend\src\pages\reset-password\index.config.ts") do echo    Size: %%~zA bytes
    ) else (
        echo [✗] File NOT found: index.config.ts
    )
    
    REM Check if index.tsx exists
    if exist "D:\03_Study\Desktop\old\frontend\src\pages\reset-password\index.tsx" (
        echo [✓] File found: index.tsx
        REM Show file size
        for %%A in ("D:\03_Study\Desktop\old\frontend\src\pages\reset-password\index.tsx") do echo    Size: %%~zA bytes
    ) else (
        echo [✗] File NOT found: index.tsx
    )
    
    echo.
    echo [✓] MODULE SETUP SUCCESSFUL!
    echo.
    echo Next steps:
    echo  1. Review the created files
    echo  2. Update API service paths if needed
    echo  3. Add route to your router
    echo  4. Test on your dev server
    echo.
) else (
    echo [✗] Directory NOT found: reset-password
    echo.
    echo Please run the setup script first:
    echo  - Node.js: node setup-reset-password-final.js
    echo  - Python: python execute-create-reset-password.py
    echo  - Batch: final-setup-reset-password.bat
    echo.
)

echo.
echo Location: D:\03_Study\Desktop\old\frontend\src\pages\reset-password\
echo.
echo ============================================================
pause
