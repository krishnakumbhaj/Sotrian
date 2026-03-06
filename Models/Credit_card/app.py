import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib

print("="*60)
print("FRAUD DETECTION - SIMPLE & FAST")
print("="*60)

# Load data with UTF-8 encoding
df = pd.read_csv(r'X:\Web Development\Nextjs_Projects\New folder\Models\Data\creditcard.csv', encoding='utf-8', encoding_errors='ignore')

print(f"\nLoaded {len(df):,} transactions")
print(f"Fraud cases: {df['Class'].sum()} ({df['Class'].sum()/len(df)*100:.2f}%)")

# Split data
X = df.drop('Class', axis=1)
y = df['Class']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\nTrain: {len(X_train):,} | Test: {len(X_test):,}")

# Scale
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Decision Tree only
print("\nTraining Decision Tree...")
model = DecisionTreeClassifier(max_depth=15, random_state=42)
model.fit(X_train_scaled, y_train)
print("✓ Training complete!")

# Evaluate
y_pred = model.predict(X_test_scaled)
print(f"\nAccuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")

# Save
joblib.dump(model, 'fraud_model.pkl')
joblib.dump(scaler, 'scaler.pkl')
print("\n✓ Model saved!")

# ============================================
# HARDCODED TRANSACTION TESTING
# ============================================
print("\n" + "="*60)
print("TESTING HARDCODED TRANSACTIONS")
print("="*60)

# Get column names in correct order from training data
feature_columns = X.columns.tolist()

# Test Transaction 1: Legitimate pattern
trans1_data = {
    'Time': 5000, 
    'V1': 0.5, 'V2': 0.3, 'V3': 0.2, 'V4': 0.1, 'V5': 0.4,
    'V6': 0.2, 'V7': 0.1, 'V8': 0.3, 'V9': 0.2, 'V10': 0.1,
    'V11': 0.3, 'V12': 0.2, 'V13': 0.1, 'V14': 0.4, 'V15': 0.2,
    'V16': 0.1, 'V17': 0.3, 'V18': 0.2, 'V19': 0.1, 'V20': 0.2,
    'V21': 0.1, 'V22': 0.2, 'V23': 0.1, 'V24': 0.3, 'V25': 0.1,
    'V26': 0.2, 'V27': 0.1, 'V28': 0.1,
    'Amount': 50.0
}

# Test Transaction 2: Suspicious pattern
trans2_data = {
    'Time': 50000,
    'V1': -3.5, 'V2': 4.2, 'V3': -2.8, 'V4': 3.1, 'V5': -2.5,
    'V6': 2.0, 'V7': -3.0, 'V8': 2.5, 'V9': -1.8, 'V10': 3.5,
    'V11': -2.2, 'V12': 2.8, 'V13': -1.5, 'V14': 3.0, 'V15': -2.8,
    'V16': 2.2, 'V17': -3.5, 'V18': 1.8, 'V19': -1.5, 'V20': 2.5,
    'V21': -1.8, 'V22': 2.3, 'V23': -1.2, 'V24': 1.5, 'V25': -1.8,
    'V26': 1.0, 'V27': -1.5, 'V28': 0.8,
    'Amount': 500.0
}

# Test Transaction 3: Normal shopping
trans3_data = {
     'Time': 84000,
    'V1': -5.2, 'V2': 6.8, 'V3': -4.5, 'V4': 5.1, 'V5': -3.9,
    'V6': 4.2, 'V7': -5.0, 'V8': 4.8, 'V9': -3.5, 'V10': 6.2,
    'V11': -4.5, 'V12': 5.5, 'V13': -3.2, 'V14': 6.0, 'V15': -5.5,
    'V16': 4.8, 'V17': -6.5, 'V18': 3.9, 'V19': -3.8, 'V20': 5.2,
    'V21': -4.2, 'V22': 5.8, 'V23': -3.5, 'V24': 3.2, 'V25': -4.8,
    'V26': 2.5, 'V27': -3.8, 'V28': 2.2,
    'Amount': 1250.0
}

# Create DataFrames with correct column order
trans1 = pd.DataFrame([trans1_data], columns=feature_columns)
trans2 = pd.DataFrame([trans2_data], columns=feature_columns)
trans3 = pd.DataFrame([trans3_data], columns=feature_columns)

transactions = [
    ("Transaction 1 - Small Amount", trans1),
    ("Transaction 2 - High Risk Pattern", trans2),
    ("Transaction 3 - Regular Shopping", trans3)
]

for name, trans in transactions:
    trans_scaled = scaler.transform(trans)
    prediction = model.predict(trans_scaled)[0]
    probability = model.predict_proba(trans_scaled)[0]
    
    print(f"\n{name}")
    print(f"  Amount: ${trans['Amount'].values[0]:.2f}")
    
    if prediction == 1:
        print(f"  Result: 🚨 FRAUD DETECTED!")
        print(f"  Fraud Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ❌ BLOCK TRANSACTION")
    else:
        print(f"  Result: ✅ LEGITIMATE")
        print(f"  Fraud Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ✓ APPROVE TRANSACTION")

print("\n" + "="*60)
print("COMPLETE! Modify transaction values above to test more.")
print("="*60)