# Reset Password Module Setup Guide

## Overview
This guide will help you create the reset-password page module with a 3-step password reset flow (Phone → Verification Code → New Password).

## Files Created

### 1. **Python Script** (Recommended)
- **File**: `execute-create-reset-password.py`
- **Location**: `D:\03_Study\Desktop\old\`
- **How to run**:
  ```bash
  cd D:\03_Study\Desktop\old
  python execute-create-reset-password.py
  ```

### 2. **Node.js Script** (Alternative)
- **File**: `create-reset-password-files.js`
- **Location**: `D:\03_Study\Desktop\old\`
- **How to run**:
  ```bash
  cd D:\03_Study\Desktop\old
  node create-reset-password-files.js
  ```

### 3. **Batch Script** (Windows Automation)
- **File**: `final-setup-reset-password.bat`
- **Location**: `D:\03_Study\Desktop\old\`
- **How to run**: Double-click the .bat file or run:
  ```cmd
  D:\03_Study\Desktop\old\final-setup-reset-password.bat
  ```

## Expected Output

After running any of the above scripts, the following directory structure will be created:

```
D:\03_Study\Desktop\old\frontend\src\pages\reset-password\
├── index.config.ts       # Page configuration
└── index.tsx             # React component with 3-step flow
```

## Files That Will Be Created

### index.config.ts
Contains page configuration:
```typescript
export default definePageConfig({
  navigationBarTitleText: '重置密码',
})
```

### index.tsx
A complete React component with:
- **Step 1**: Phone number input with SMS sending
- **Step 2**: Verification code input (6-digit validation)
- **Step 3**: New password setup with confirmation
- Progress indicators showing current step
- Validation for:
  - Valid 11-digit phone number
  - 6-digit verification code
  - Password: 8+ characters with uppercase, lowercase, and digits
  - Password confirmation matching
- Loading states and error handling
- Countdown timer for SMS resend
- Navigation between steps with "back" buttons

## Features

### Step 1: Phone Input
- Phone number validation (11 digits starting with 1)
- SMS code sending functionality
- 60-second countdown before retry
- Error handling and user feedback

### Step 2: Verification
- 6-digit code input field
- Verification against sent code
- Resend SMS code option with countdown
- Back button to return to phone input

### Step 3: Password Reset
- New password input with show/hide toggle
- Confirm password input with show/hide toggle
- Real-time password validation
  - Minimum 8 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain digit
- Confirmation matching check
- Success notification and redirect to login

## Component Integration

The component uses the following services (ensure these are implemented):
- `sendSmsCode(phone)` - Send verification code
- `verifyCode(phone, code)` - Verify the code
- `resetPassword(phone, code, password)` - Reset password

## Usage Example

```typescript
import ResetPasswordPage from '@/pages/reset-password'

// Use in your app router or next.js
```

## Styling

The component uses Tailwind CSS classes for styling:
- Responsive design (mobile and desktop friendly)
- Blue color scheme with gradient background
- Smooth transitions and animations
- Accessible form inputs and buttons

## Next Steps

1. Run one of the setup scripts above
2. Ensure the API endpoints are implemented:
   - POST `/api/sms/send` - Send verification code
   - POST `/api/sms/verify` - Verify code
   - POST `/api/password/reset` - Reset password
3. Update the import paths if your service structure differs
4. Test the component in your application

## Troubleshooting

### Script Execution Issues

**If Python script fails:**
- Ensure Python is installed: `python --version`
- Try: `python execute-create-reset-password.py`

**If Node.js script fails:**
- Ensure Node.js is installed: `node --version`
- Try: `node create-reset-password-files.js`

**If both fail:**
- Run the batch script: `final-setup-reset-password.bat`
- Or manually:
  1. Create folder: `D:\03_Study\Desktop\old\frontend\src\pages\reset-password`
  2. Copy the content from this guide into:
     - `index.config.ts`
     - `index.tsx`

## Support

If you encounter any issues:
1. Verify the parent directory exists: `D:\03_Study\Desktop\old\frontend\src\pages\`
2. Ensure you have write permissions to the directory
3. Check that either Python or Node.js is available in your PATH

---

**Created**: $(date)
**Status**: Ready for implementation
