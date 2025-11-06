"""
Train all ML models for fraud detection
This script trains:
1. Credit Card Fraud Detection (Decision Tree)
2. Email Spam Detection (Naive Bayes)
3. URL Fraud Detection (Random Forest)
4. UPI Fraud Detection (if available)
"""

import os
import sys
from pathlib import Path

# Set base path
BASE_PATH = Path(__file__).parent

print("="*70)
print("🚀 TRAINING ALL FRAUD DETECTION MODELS")
print("="*70)

# Track success/failures
results = {}

# 1. Train Credit Card Model
print("\n" + "="*70)
print("1️⃣  TRAINING CREDIT CARD FRAUD MODEL")
print("="*70)
try:
    os.chdir(BASE_PATH / 'Credit_card')
    exec(open('app.py').read())
    results['Credit Card'] = '✅ Success'
except Exception as e:
    results['Credit Card'] = f'❌ Failed: {str(e)}'
    print(f"❌ Error: {e}")

# 2. Train Email Spam Model
print("\n" + "="*70)
print("2️⃣  TRAINING EMAIL SPAM DETECTION MODEL")
print("="*70)
try:
    os.chdir(BASE_PATH / 'Emails_Spam')
    exec(open('app.py').read())
    results['Email Spam'] = '✅ Success'
except Exception as e:
    results['Email Spam'] = f'❌ Failed: {str(e)}'
    print(f"❌ Error: {e}")

# 3. Train URL Fraud Model
print("\n" + "="*70)
print("3️⃣  TRAINING URL FRAUD DETECTION MODEL")
print("="*70)
try:
    os.chdir(BASE_PATH / 'URL_fraud')
    exec(open('app.py').read())
    results['URL Fraud'] = '✅ Success'
except Exception as e:
    results['URL Fraud'] = f'❌ Failed: {str(e)}'
    print(f"❌ Error: {e}")

# 4. Train UPI Fraud Model (if exists)
print("\n" + "="*70)
print("4️⃣  TRAINING UPI FRAUD DETECTION MODEL")
print("="*70)
try:
    os.chdir(BASE_PATH / 'UPI-fraud')
    if os.path.exists('app.py'):
        exec(open('app.py').read())
        results['UPI Fraud'] = '✅ Success'
    else:
        results['UPI Fraud'] = '⚠️  No training script found'
        print("⚠️  No app.py found in UPI-fraud folder")
except Exception as e:
    results['UPI Fraud'] = f'❌ Failed: {str(e)}'
    print(f"❌ Error: {e}")

# Return to base directory
os.chdir(BASE_PATH)

# Summary
print("\n" + "="*70)
print("📊 TRAINING SUMMARY")
print("="*70)
for model_name, status in results.items():
    print(f"{model_name:20s} : {status}")

# Check if all succeeded
all_success = all('✅' in status for status in results.values())
if all_success:
    print("\n🎉 All models trained successfully!")
    print("\n✅ You can now restart the FastAPI server to use the trained models.")
else:
    print("\n⚠️  Some models failed to train. Check errors above.")
    print("   The system will fall back to LLM-only reasoning for failed models.")

print("="*70)
