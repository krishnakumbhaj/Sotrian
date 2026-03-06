import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import nltk
import string
import re
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

print("="*60)
print("SMS SPAM DETECTION - SIMPLE & FAST")
print("="*60)

# Training data from CSV - try different encodings
csv_path = r'X:\Web Development\Nextjs_Projects\New folder\Models\Data\spam.csv'

try:
    # Try Latin-1 encoding first (common for SMS datasets)
    data = pd.read_csv(csv_path, encoding='latin-1')
except UnicodeDecodeError:
    try:
        # Try Windows-1252 encoding
        data = pd.read_csv(csv_path, encoding='cp1252')
    except UnicodeDecodeError:
        # Try ISO-8859-1 encoding
        data = pd.read_csv(csv_path, encoding='iso-8859-1')

# Check column names and rename if needed
print(f"Columns found: {data.columns.tolist()}")

# Handle different possible column names
if 'v1' in data.columns:
    data = data.rename(columns={'v1': 'label', 'v2': 'message'})
elif 'label' not in data.columns or 'message' not in data.columns:
    # Assume first two columns are label and message
    data.columns = ['label', 'message'] + list(data.columns[2:])

# Keep only necessary columns
df = data[['label', 'message']].copy()

# Remove any rows with missing values
df = df.dropna()

# Map labels to binary
df['Class'] = df['label'].map({'ham': 0, 'spam': 1})

print(f"\nLoaded {len(df)} messages")
print(f"Spam cases: {df['Class'].sum()} ({df['Class'].sum()/len(df)*100:.2f}%)")

# Text preprocessing function
ps = PorterStemmer()
stop_words = set(stopwords.words('english'))

def preprocess_text(text):
    # Convert to string in case of any non-string values
    text = str(text)
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\S+@\S+', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = nltk.word_tokenize(text)
    tokens = [token for token in tokens if token.isalnum()]
    tokens = [token for token in tokens if token not in stop_words and token not in string.punctuation]
    tokens = [ps.stem(token) for token in tokens]
    return " ".join(tokens)

# Preprocess messages
print("\nPreprocessing messages...")
df['processed'] = df['message'].apply(preprocess_text)

# Split data
X = df['processed']
y = df['Class']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")

# Vectorize
vectorizer = TfidfVectorizer(max_features=3000)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# Train Naive Bayes
print("\nTraining Naive Bayes...")
model = MultinomialNB()
model.fit(X_train_vec, y_train)
print("✓ Training complete!")

# Evaluate
y_pred = model.predict(X_test_vec)
print(f"\nAccuracy:  {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
print(f"F1-Score:  {f1_score(y_test, y_pred):.4f}")

# Save
joblib.dump(model, 'spam_model.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')
print("\n✓ Model saved!")

# ============================================
# HARDCODED MESSAGE TESTING
# ============================================
print("\n" + "="*60)
print("TESTING HARDCODED MESSAGES")
print("="*60)

# Hardcoded test messages
test_messages = [
    ("Message 1 - Casual Chat", 
     "Hey, want to grab lunch today?"),
    
    ("Message 2 - Prize Scam", 
     "CONGRATULATIONS! You've won a FREE prize! Call now to claim your reward!"),
    
    ("Message 3 - Normal Request", 
     "Can you pick up some milk on your way home?"),
    
    ("Message 4 - Lottery Spam", 
     "WIN £1000 CASH! Text WIN to 12345 now! Limited time offer! Free entry!"),
    
    ("Message 5 - Work Related", 
     "Meeting at 3pm in conference room B"),
    
    ("Message 6 - Phishing Attack", 
     "URGENT: Your account has been compromised. Click here immediately to secure your account!"),
    
    ("Message 7 - Weekend Plans", 
     "Are you free this weekend for the movie?"),
    
    ("Message 8 - iPhone Scam", 
     "FREE ENTRY! Win a brand new iPhone 15! Text NOW to 55555! Act fast!"),
    
    ("Message 9 - Reminder", 
     "Don't forget to buy groceries from the store"),
    
    ("Message 10 - Gift Scam", 
     "CLAIM YOUR FREE GIFT! You have been selected as a winner! Call 1800-XXX-XXXX now!")
]

for name, message in test_messages:
    # Preprocess message
    processed = preprocess_text(message)
    
    # Vectorize
    message_vec = vectorizer.transform([processed])
    
    # Predict
    prediction = model.predict(message_vec)[0]
    probability = model.predict_proba(message_vec)[0]
    
    print(f"\n{name}")
    print(f"  Text: {message[:60]}{'...' if len(message) > 60 else ''}")
    
    if prediction == 1:
        print(f"  Result: 🚨 SPAM DETECTED!")
        print(f"  Spam Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ❌ BLOCK MESSAGE")
    else:
        print(f"  Result: ✅ LEGITIMATE")
        print(f"  Spam Risk: {probability[1]*100:.1f}%")
        print(f"  Action: ✓ DELIVER MESSAGE")

print("\n" + "="*60)
print("COMPLETE! Modify messages above to test more.")
print("="*60)