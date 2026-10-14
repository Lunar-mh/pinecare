@echo off
cd /d D:\03_Study\Desktop\old
mkdir frontend\src\pages\reset-password 2>nul

REM Create index.config.ts
(
echo export default definePageConfig^({
echo   navigationBarTitleText: '重置密码',
echo }^)
) > frontend\src\pages\reset-password\index.config.ts

echo Created index.config.ts

REM Create index.tsx - This is a large file, so we'll use Python for better handling
python setup-reset-password.py

echo All files created successfully!
pause
