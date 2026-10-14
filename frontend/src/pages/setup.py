#!/usr/bin/env python3
import os
import sys

try:
    # Create directory
    os.makedirs(r'D:\03_Study\Desktop\old\frontend\src\pages\reset-password', exist_ok=True)
    print("✓ Directory created")
except Exception as e:
    print(f"Error creating directory: {e}")
    sys.exit(1)

# Rest of the file creation would go here
