import os
import sys

# Execute the main creation script
os.system('python create-reset-password-final.py')

# Also create the SCSS file
pages_dir = r'D:\03_Study\Desktop\old\frontend\src\pages'
reset_password_dir = os.path.join(pages_dir, 'reset-password')

scss_content = """.reset-password-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.reset-container {
  width: 100%;
  max-width: 500px;
}

.reset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px 0;
}

.back-btn,
.back-btn-placeholder {
  width: 40px;
  height: 40px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0;
  padding: 0;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 0.7;
  }
}

.reset-title {
  flex: 1;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.steps-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.5;
  transition: opacity 0.3s ease;

  &.active {
    opacity: 1;
  }
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #666;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.3s ease;

  .step.active & {
    background-color: #0066cc;
    color: white;
  }
}

.step-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;

  .step.active & {
    color: #0066cc;
    font-weight: 500;
  }
}

.step-line {
  flex: 1;
  height: 2px;
  background-color: #e0e0e0;
  margin: 0 12px;
  transition: background-color 0.3s ease;

  .step.active ~ & {
    background-color: #0066cc;
  }
}

.reset-form {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.form-step {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 20px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s ease;
  background-color: #f9f9f9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  &:focus {
    outline: none;
    border-color: #0066cc;
    background-color: white;
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  &:disabled {
    background-color: #f0f0f0;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::placeholder {
    color: #999;
  }
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  .form-input {
    padding-right: 45px;
  }
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #999;
  transition: color 0.3s ease;

  &:hover {
    color: #0066cc;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.error-message {
  color: #e53e3e;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background-color: #fff5f5;
  border-radius: 8px;
  border-left: 3px solid #e53e3e;
}

.success-message {
  color: #22863a;
  font-size: 13px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background-color: #f0f8f4;
  border-radius: 8px;
  border-left: 3px solid #22863a;
}

.countdown-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background-color: #0066cc;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.password-requirements {
  margin: 16px 0 24px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.requirement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #999;
  transition: color 0.3s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &.met {
    color: #22863a;
  }

  &.met svg {
    color: #22863a;
  }

  svg {
    flex-shrink: 0;
    color: #999;
  }
}

.submit-btn,
.secondary-btn {
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.submit-btn {
  background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
  color: white;

  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #c0c0c0;
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.secondary-btn {
  background-color: transparent;
  color: #0066cc;
  border: 2px solid #0066cc;

  &:hover:not(:disabled) {
    background-color: #f0f5ff;
  }

  &:disabled {
    border-color: #c0c0c0;
    color: #c0c0c0;
    cursor: not-allowed;
  }
}

/* Responsive design */
@media (max-width: 600px) {
  .reset-password-page {
    padding: 12px;
  }

  .reset-form {
    padding: 24px;
  }

  .steps-indicator {
    padding: 16px;
    margin-bottom: 24px;
  }

  .step-label {
    font-size: 11px;
  }

  .step-line {
    margin: 0 8px;
  }

  .reset-header {
    margin-bottom: 20px;
  }

  .form-label {
    font-size: 13px;
  }

  .form-input {
    font-size: 16px;
    padding: 11px 14px;
  }

  .submit-btn,
  .secondary-btn {
    padding: 12px 14px;
    font-size: 15px;
  }
}
"""

scss_file = os.path.join(reset_password_dir, 'index.scss')
with open(scss_file, 'w', encoding='utf-8') as f:
    f.write(scss_content)
print(f'✓ Created file: {scss_file}')

print('\n✅ All files including SCSS have been created successfully!')
