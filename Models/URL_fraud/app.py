import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import re
from urllib.parse import urlparse

print("="*60)
print("URL SPAM DETECTION - SIMPLE & FAST")
print("="*60)

# Load data
csv_path = r'X:\Web Development\Nextjs_Projects\New folder\Models\Data\Url.csv'

try:
    df = pd.read_csv(csv_path, encoding='utf-8')
except UnicodeDecodeError:
    df = pd.read_csv(csv_path, encoding='latin-1')

print(f"\nLoaded {len(df):,} URLs")
print(f"Spam URLs: {df['status'].sum()} ({df['status'].sum()/len(df)*100:.2f}%)")

# Split data
X = df.drop(['url', 'status'], axis=1)
y = df['status']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\nTrain: {len(X_train):,} | Test: {len(X_test):,}")

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Random Forest
print("\nTraining Random Forest...")
model = RandomForestClassifier(n_estimators=100, max_depth=20, random_state=42)
model.fit(X_train_scaled, y_train)
print("✓ Training complete!")

# Evaluate
y_pred = model.predict(X_test_scaled)
print(f"\nAccuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")

# Save models
joblib.dump(model, 'url_spam_model.pkl')
joblib.dump(scaler, 'url_scaler.pkl')
print("\n✓ Model saved!")

# ============================================
# URL FEATURE EXTRACTION FUNCTION
# ============================================
def extract_url_features(url):
    """Extract features from a URL"""
    
    # Basic features
    url_length = len(url)
    num_digits = sum(c.isdigit() for c in url)
    digit_ratio = num_digits / url_length if url_length > 0 else 0
    
    # Special characters
    special_chars = sum(not c.isalnum() and c not in ['.', '-', '_', '/', ':', '?', '=', '@', '%', '#', '&'] for c in url)
    special_char_ratio = special_chars / url_length if url_length > 0 else 0
    
    # Count specific characters
    num_hyphens = url.count('-')
    num_underscores = url.count('_')
    num_slashes = url.count('/')
    num_dots = url.count('.')
    num_question_marks = url.count('?')
    num_equals = url.count('=')
    num_at_symbols = url.count('@')
    num_percent = url.count('%')
    num_hashes = url.count('#')
    num_ampersands = url.count('&')
    
    # Domain analysis
    try:
        parsed = urlparse(url if '://' in url else 'http://' + url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        num_subdomains = len(domain.split('.')) - 2 if len(domain.split('.')) > 2 else 0
    except:
        num_subdomains = 0
    
    # HTTPS check
    is_https = 1 if url.startswith('https://') else 0
    
    # Suspicious words
    suspicious_words = ['login', 'verify', 'account', 'secure', 'update', 'confirm', 
                       'banking', 'password', 'signin', 'ebayisapi', 'webscr', 'lucky',
                       'winner', 'prize', 'free', 'click', 'here', 'now', 'urgent']
    has_suspicious_word = 1 if any(word in url.lower() for word in suspicious_words) else 0
    
    return {
        'url_length': url_length,
        'num_digits': num_digits,
        'digit_ratio': digit_ratio,
        'special_char_ratio': special_char_ratio,
        'num_hyphens': num_hyphens,
        'num_underscores': num_underscores,
        'num_slashes': num_slashes,
        'num_dots': num_dots,
        'num_question_marks': num_question_marks,
        'num_equals': num_equals,
        'num_at_symbols': num_at_symbols,
        'num_percent': num_percent,
        'num_hashes': num_hashes,
        'num_ampersands': num_ampersands,
        'num_subdomains': num_subdomains,
        'is_https': is_https,
        'has_suspicious_word': has_suspicious_word
    }

# ============================================
# HARDCODED URL TESTING
# ============================================
print("\n" + "="*60)
print("TESTING HARDCODED URLS")
print("="*60)

# Hardcoded test URLs
test_urls = [
    ("URL 1 - Legitimate Site",
     "https://www.google.com"),
    
    ("URL 2 - Phishing Attempt",
     "http://secure-paypal-verify-account-login.suspicious-site.com"),
    
    ("URL 3 - Normal Website",
     "https://github.com/user/repository"),
    
    ("URL 4 - Suspicious Numbers",
     "http://000111paypal-verify.godaddysites.com"),
    
    ("URL 5 - Legitimate Business",
     "https://www.amazon.com/products"),
    
    ("URL 6 - Banking Phish",
     "http://yourbank-secure-login-verify.tk/update"),
    
    ("URL 7 - Short URL Service",
     "https://bit.ly/3xYz"),
    
    ("URL 8 - Prize Scam",
     "http://claim-your-free-prize-winner-now.online"),
    
    ("URL 9 - Corporate Site",
     "https://www.microsoft.com/en-us/windows"),
    
    ("URL 10 - Account Phishing",
     "http://urgent-account-verification-required.net/signin")
]

# Get feature names from training data
feature_names = X.columns.tolist()

for name, url in test_urls:
    # Extract features
    features = extract_url_features(url)
    
    # Create DataFrame with correct column order
    url_df = pd.DataFrame([features], columns=feature_names)
    
    # Scale features
    url_scaled = scaler.transform(url_df)
    
    # Predict
    prediction = model.predict(url_scaled)[0]
    probability = model.predict_proba(url_scaled)[0]
    
    print(f"\n{name}")
    print(f"  URL: {url[:70]}{'...' if len(url) > 70 else ''}")
    print(f"  Length: {features['url_length']} | HTTPS: {'Yes' if features['is_https'] else 'No'} | Suspicious Words: {'Yes' if features['has_suspicious_word'] else 'No'}")
    
    if prediction == 1:
        print(f"  Result: 🚨 MALICIOUS URL DETECTED!")
        print(f"  Threat Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ❌ BLOCK ACCESS")
    else:
        print(f"  Result: ✅ SAFE URL")
        print(f"  Threat Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ✓ ALLOW ACCESS")

print("\n" + "="*60)
print("COMPLETE! Modify URLs above to test more.")
print("="*60)