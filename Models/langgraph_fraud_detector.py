"""
LangGraph Fraud Detection System - Improved Version
Integrates ML models with LLM reasoning for comprehensive fraud detection
Now with natural conversational AI and better output formatting
"""

import os
import json
import pickle
import pandas as pd
import numpy as np
from typing import TypedDict, Annotated, Literal
from datetime import datetime
import joblib
import re
from urllib.parse import urlparse

# LangGraph and Google AI imports
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

# ML preprocessing imports
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk
import string
from nltk.corpus import stopwords
from nltk.stem.porter import PorterStemmer

# Download NLTK data if needed
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

# ============================================
# PYDANTIC MODELS FOR STRUCTURED OUTPUT
# ============================================

class FraudDetectionResult(BaseModel):
    """Structured output for fraud detection"""
    fraud_type: str = Field(description="Type of fraud detection: credit_card, email_spam, url_fraud, or upi_fraud")
    is_fraud: bool = Field(description="Whether fraud was detected")
    confidence: float = Field(description="Confidence score between 0 and 1")
    risk_level: str = Field(description="Risk level: LOW, MEDIUM, HIGH, CRITICAL")
    detection_method: str = Field(description="Method used: ML_MODEL, LLM_REASONING, or HYBRID")
    reasoning: str = Field(description="Explanation of the detection")
    recommendation: str = Field(description="Recommended action")
    details: dict = Field(description="Additional details about the detection")


# ============================================
# STATE DEFINITION
# ============================================

class FraudDetectionState(TypedDict):
    """State for the fraud detection graph"""
    user_input: str
    fraud_type: str
    parsed_data: dict
    ml_prediction: dict
    llm_analysis: dict
    final_result: dict
    messages: list


# ============================================
# ML MODEL LOADER
# ============================================

class MLModelLoader:
    """Loads and manages ML models"""
    
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.models = {}
        self.scalers = {}
        self.vectorizers = {}
        
    def load_credit_card_model(self):
        """Load credit card fraud detection model"""
        try:
            model_path = os.path.join(self.base_path, "Credit_card", "fraud_model.pkl")
            scaler_path = os.path.join(self.base_path, "Credit_card", "scaler.pkl")
            
            self.models['credit_card'] = joblib.load(model_path)
            self.scalers['credit_card'] = joblib.load(scaler_path)
            print("✓ Credit Card model loaded")
        except Exception as e:
            print(f"✗ Credit Card model not found: {e}")
            
    def load_spam_model(self):
        """Load email/SMS spam detection model"""
        try:
            model_path = os.path.join(self.base_path, "Emails_Spam", "spam_model.pkl")
            vectorizer_path = os.path.join(self.base_path, "Emails_Spam", "vectorizer.pkl")
            
            self.models['spam'] = joblib.load(model_path)
            self.vectorizers['spam'] = joblib.load(vectorizer_path)
            print("✓ Spam detection model loaded")
        except Exception as e:
            print(f"✗ Spam model not found: {e}")
            
    def load_url_model(self):
        """Load URL fraud detection model"""
        try:
            model_path = os.path.join(self.base_path, "URL_fraud", "url_spam_model.pkl")
            scaler_path = os.path.join(self.base_path, "URL_fraud", "url_scaler.pkl")
            
            self.models['url'] = joblib.load(model_path)
            self.scalers['url'] = joblib.load(scaler_path)
            print("✓ URL fraud model loaded")
        except Exception as e:
            print(f"✗ URL model not found: {e}")
    
    def load_all_models(self):
        """Load all available models"""
        self.load_credit_card_model()
        self.load_spam_model()
        self.load_url_model()


# ============================================
# FEATURE EXTRACTION UTILITIES
# ============================================

class FeatureExtractor:
    """Extract features for different fraud types"""
    
    def __init__(self):
        self.ps = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))
    
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for spam detection"""
        text = str(text).lower()
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        text = re.sub(r'\S+@\S+', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        tokens = nltk.word_tokenize(text)
        tokens = [token for token in tokens if token.isalnum()]
        tokens = [token for token in tokens if token not in self.stop_words and token not in string.punctuation]
        tokens = [self.ps.stem(token) for token in tokens]
        return " ".join(tokens)
    
    def extract_url_features(self, url: str) -> dict:
        """Extract features from URL"""
        url_length = len(url)
        num_digits = sum(c.isdigit() for c in url)
        digit_ratio = num_digits / url_length if url_length > 0 else 0
        
        special_chars = sum(not c.isalnum() and c not in ['.', '-', '_', '/', ':', '?', '=', '@', '%', '#', '&'] for c in url)
        special_char_ratio = special_chars / url_length if url_length > 0 else 0
        
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
        
        try:
            parsed = urlparse(url if '://' in url else 'http://' + url)
            domain = parsed.netloc or parsed.path.split('/')[0]
            num_subdomains = len(domain.split('.')) - 2 if len(domain.split('.')) > 2 else 0
        except:
            num_subdomains = 0
        
        is_https = 1 if url.startswith('https://') else 0
        
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
# LANGGRAPH NODES
# ============================================

class FraudDetectionGraph:
    """LangGraph workflow for fraud detection"""
    
    def __init__(self, google_api_key: str, models_base_path: str):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=google_api_key,
            temperature=0.1,
            streaming=True
        )
        
        self.model_loader = MLModelLoader(models_base_path)
        self.model_loader.load_all_models()
        
        self.feature_extractor = FeatureExtractor()
        
        # Build the graph
        self.graph = self.build_graph()

    def _clean_response_text(self, s: str) -> str:
        """Remove stray markers like lone 'K' or 'AI' lines and leading labels from LLM conversational text.

        This was previously a nested helper inside validate_input; promote it to a class method so
        other nodes (reasoning/recommendation/formatted_message) can be sanitized consistently.
        """
        if not s:
            return s
        # Normalize whitespace
        s = s.strip()

        # Remove fenced blocks if present (e.g. ```json ... ```)
        if s.startswith('```json'):
            s = s.replace('```json', '').replace('```', '').strip()
        elif s.startswith('```'):
            s = s.replace('```', '').strip()

        # Remove lines that are only a single capital letter or short markers (e.g. 'K', 'AI')
        lines = [ln for ln in s.splitlines() if not re.fullmatch(r"\s*(?:[A-Z]{1,3}|AI|K)\s*", ln)]
        s = '\n'.join(lines).strip()

        # Remove leading labels like 'AI:' or 'Assistant -' etc.
        s = re.sub(r'^\s*(?:AI|Assistant|K)[:\-\s]+', '', s)

        return s
    
    def validate_input(self, state: FraudDetectionState) -> FraudDetectionState:
        """Validate input using LLM to categorize query type and respond appropriately"""
        
        validation_prompt = f"""You are an intelligent conversational AI assistant specialized in fraud detection. Your job is to understand what the user wants and respond naturally.

User Input: "{state['user_input']}"

Analyze this input and determine:
1. Is this a genuine fraud detection request?
2. Is this a normal conversation (greeting, question about you, general chat)?
3. Is this garbage/random text that makes no sense?
4. Is this an off-topic question?

Think about the user's intent naturally. Don't just pattern match - understand the context.

Respond with a JSON object:
{{
  "category": "FRAUD_QUERY" or "CONVERSATION" or "GARBAGE" or "OFF_TOPIC",
  "is_fraud_request": true or false,
  "conversational_response": "Your natural, friendly response to the user. Be helpful and professional. If it's fraud-related, say you'll analyze it. If it's conversation, chat naturally but remind them you're a fraud detection assistant. If it's garbage, politely ask for clarification. If off-topic, kindly redirect to your expertise.",
  "reasoning": "Brief explanation of your understanding"
}}

Guidelines:
- For greetings/intros: Be warm and introduce yourself naturally
- For capability questions: Explain what you do in a conversational way
- For fraud requests: Acknowledge and proceed with analysis
- For garbage text: Don't be rude, just ask them to clarify what they need
- For off-topic: Politely redirect but stay friendly
- Always remind them you're here for fraud detection, but do it naturally

Examples of good responses:
- Input: "hi" → "Hello! I'm a fraud detection assistant. I help analyze credit card transactions, emails, URLs, and UPI payments to detect potential fraud. How can I assist you today?"
- Input: "jkdsf3j4lksdflk" → "I'm having trouble understanding that. Could you please clarify what you'd like me to help you with? I specialize in fraud detection for transactions, emails, URLs, and UPI payments."
- Input: "what's the weather" → "I'm not able to help with weather information, but I'm excellent at detecting fraud! I can analyze credit card transactions, emails for spam, suspicious URLs, and UPI payments. Is there anything related to fraud detection I can help you with?"
- Input: "check this transaction amount 500" → "I'll analyze that transaction for you right away. Let me check for any fraud indicators."

Be natural, helpful, and conversational. Don't sound robotic."""

        response = self.llm.invoke(validation_prompt)

        # Use class-level _clean_response_text helper to sanitize any LLM-produced text

        try:
            content = response.content
            content = self._clean_response_text(content)
            validation_result = json.loads(content)
            category = validation_result.get('category', 'CONVERSATION')
            is_fraud_request = validation_result.get('is_fraud_request', False)
            conversational_response = validation_result.get('conversational_response', '')
            reasoning = validation_result.get('reasoning', '')
            # Clean stray markers from LLM outputs (e.g. stray 'K' or 'AI' tokens)
            conversational_response = self._clean_response_text(conversational_response)
            reasoning = self._clean_response_text(reasoning)
            
            # If not a fraud request, return the conversational response
            if not is_fraud_request:
                state['fraud_type'] = category.lower()
                state['final_result'] = {
                    'fraud_type': category.lower(),
                    'is_fraud': False,
                    'confidence': 1.0,
                    'risk_level': 'N/A',
                    'detection_method': 'CONVERSATIONAL_AI',
                    'reasoning': reasoning,
                    'recommendation': conversational_response,
                    'details': {
                        'query_type': category.lower(),
                        'original_query': state['user_input'],
                        'is_conversational': True
                    }
                }
                return state
            
            # Proceed with fraud detection
            state['messages'] = [f'Processing fraud detection request: {reasoning}']
            return state
            
        except Exception as e:
            # Graceful fallback with conversational response
            state['fraud_type'] = 'conversation'
            state['final_result'] = {
                'fraud_type': 'conversation',
                'is_fraud': False,
                'confidence': 1.0,
                'risk_level': 'N/A',
                'detection_method': 'CONVERSATIONAL_AI',
                'reasoning': 'Processing your request',
                'recommendation': "I'm here to help with fraud detection! I can analyze credit card transactions, emails for spam, suspicious URLs, and UPI payments. What would you like me to check?",
                'details': {'original_query': state['user_input']}
            }
            return state
    
    def classify_fraud_type(self, state: FraudDetectionState) -> FraudDetectionState:
        """Classify the type of fraud detection needed"""
        user_input = state['user_input'].lower()
        
        # Use LLM to classify the fraud type
        classification_prompt = f"""You are a fraud detection classifier. Analyze the user input and determine what type of fraud detection is needed.

User Input: {state['user_input']}

Respond with ONLY ONE of these categories:
- credit_card: If it's about credit card transactions with features like V1-V28, Time, Amount
- email_spam: If it's about emails or SMS messages text content
- url_fraud: If it's about URLs or website links
- upi_fraud: If it's about UPI transactions with payment gateway, state, merchant category, etc.

Respond with ONLY the category name (e.g., "credit_card"), nothing else."""

        response = self.llm.invoke(classification_prompt)
        fraud_type = response.content.strip().lower()
        
        # Validate fraud type
        valid_types = ['credit_card', 'email_spam', 'url_fraud', 'upi_fraud']
        if fraud_type not in valid_types:
            # Fallback classification
            if any(word in user_input for word in ['transaction', 'amount', 'v1', 'v2', 'credit card']):
                fraud_type = 'credit_card'
            elif any(word in user_input for word in ['message', 'sms', 'email', 'text', 'spam']):
                fraud_type = 'email_spam'
            elif any(word in user_input for word in ['url', 'link', 'website', 'http', 'https']):
                fraud_type = 'url_fraud'
            else:
                fraud_type = 'upi_fraud'
        
        state['fraud_type'] = fraud_type
        state['messages'] = [f"Detected fraud type: {fraud_type}"]
        
        return state
    
    def parse_input_data(self, state: FraudDetectionState) -> FraudDetectionState:
        """Parse and structure the input data"""
        user_input = state['user_input']
        fraud_type = state['fraud_type']
        
        parsing_prompt = f"""You are a data parser for fraud detection. Extract the relevant information from the user input.

Fraud Type: {fraud_type}
User Input: {user_input}

Parse the data and return it as a JSON object with the appropriate fields. Be flexible with the format.

For credit_card: Extract Time, V1-V28 (if available), Amount
For email_spam: Extract the message text
For url_fraud: Extract the URL
For upi_fraud: Extract date, transaction_type, payment_gateway, state, merchant_category, amount

Return ONLY valid JSON, no explanations."""

        response = self.llm.invoke(parsing_prompt)
        
        try:
            parsed_data = json.loads(response.content)
        except:
            # If LLM doesn't return valid JSON, try to extract manually
            parsed_data = {"raw_input": user_input}
        
        state['parsed_data'] = parsed_data
        state['messages'].append(f"Parsed data: {parsed_data}")
        
        return state
    
    def run_ml_model(self, state: FraudDetectionState) -> FraudDetectionState:
        """Run the appropriate ML model"""
        fraud_type = state['fraud_type']
        parsed_data = state['parsed_data']
        
        ml_result = {
            'model_available': False,
            'prediction': None,
            'confidence': 0.0,
            'method': 'NONE'
        }
        
        try:
            if fraud_type == 'credit_card' and 'credit_card' in self.model_loader.models:
                ml_result = self._predict_credit_card(parsed_data)
            
            elif fraud_type == 'email_spam' and 'spam' in self.model_loader.models:
                ml_result = self._predict_spam(parsed_data)
            
            elif fraud_type == 'url_fraud' and 'url' in self.model_loader.models:
                ml_result = self._predict_url(parsed_data)
            
            else:
                ml_result['method'] = 'LLM_ONLY'
                
        except Exception as e:
            ml_result['error'] = str(e)
            ml_result['method'] = 'ERROR_FALLBACK_TO_LLM'
        
        state['ml_prediction'] = ml_result
        state['messages'].append(f"ML prediction: {ml_result}")
        
        return state
    
    def _predict_credit_card(self, data: dict) -> dict:
        """Predict credit card fraud"""
        model = self.model_loader.models['credit_card']
        scaler = self.model_loader.scalers['credit_card']
        
        # Expected features: Time, V1-V28, Amount (30 features total)
        feature_names = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
        
        # Extract features from parsed data
        features = []
        for fname in feature_names:
            features.append(float(data.get(fname, 0)))
        
        # Scale and predict
        X = np.array([features])
        X_scaled = scaler.transform(X)
        prediction = model.predict(X_scaled)[0]
        probability = model.predict_proba(X_scaled)[0]
        
        return {
            'model_available': True,
            'prediction': int(prediction),
            'confidence': float(probability[1] if prediction == 1 else probability[0]),
            'probability_fraud': float(probability[1]),
            'probability_legitimate': float(probability[0]),
            'method': 'ML_MODEL'
        }
    
    def _predict_spam(self, data: dict) -> dict:
        """Predict email/SMS spam"""
        model = self.model_loader.models['spam']
        vectorizer = self.model_loader.vectorizers['spam']
        
        # Get message text
        message = data.get('message', data.get('text', data.get('raw_input', '')))
        
        # Preprocess
        processed = self.feature_extractor.preprocess_text(message)
        
        # Vectorize and predict
        X = vectorizer.transform([processed])
        prediction = model.predict(X)[0]
        probability = model.predict_proba(X)[0]
        
        return {
            'model_available': True,
            'prediction': int(prediction),
            'confidence': float(probability[1] if prediction == 1 else probability[0]),
            'probability_spam': float(probability[1]),
            'probability_legitimate': float(probability[0]),
            'method': 'ML_MODEL'
        }
    
    def _predict_url(self, data: dict) -> dict:
        """Predict URL fraud"""
        model = self.model_loader.models['url']
        scaler = self.model_loader.scalers['url']
        
        # Get URL
        url = data.get('url', data.get('link', data.get('raw_input', '')))
        
        # Extract features
        features = self.feature_extractor.extract_url_features(url)
        
        # Create DataFrame with correct feature order
        feature_names = ['url_length', 'num_digits', 'digit_ratio', 'special_char_ratio',
                        'num_hyphens', 'num_underscores', 'num_slashes', 'num_dots',
                        'num_question_marks', 'num_equals', 'num_at_symbols', 'num_percent',
                        'num_hashes', 'num_ampersands', 'num_subdomains', 'is_https',
                        'has_suspicious_word']
        
        X = np.array([[features[fname] for fname in feature_names]])
        X_scaled = scaler.transform(X)
        
        prediction = model.predict(X_scaled)[0]
        probability = model.predict_proba(X_scaled)[0]
        
        return {
            'model_available': True,
            'prediction': int(prediction),
            'confidence': float(probability[1] if prediction == 1 else probability[0]),
            'probability_fraud': float(probability[1]),
            'probability_legitimate': float(probability[0]),
            'method': 'ML_MODEL',
            'url_features': features
        }
    
    def llm_analysis(self, state: FraudDetectionState) -> FraudDetectionState:
        """Use LLM for analysis and reasoning"""
        fraud_type = state['fraud_type']
        parsed_data = state['parsed_data']
        ml_prediction = state['ml_prediction']
        
        # Determine if we need LLM analysis
        use_llm = (
            not ml_prediction['model_available'] or
            ml_prediction['method'] in ['NONE', 'LLM_ONLY', 'ERROR_FALLBACK_TO_LLM'] or
            ml_prediction['confidence'] < 0.7  # Low confidence threshold
        )
        
        if use_llm:
            analysis_prompt = self._build_llm_analysis_prompt(fraud_type, parsed_data, ml_prediction)
            
            response = self.llm.invoke(analysis_prompt)
            
            try:
                # Clean up response - remove markdown code blocks if present
                content = response.content.strip()
                if content.startswith('```json'):
                    content = content.replace('```json', '').replace('```', '').strip()
                elif content.startswith('```'):
                    content = content.replace('```', '').strip()
                
                llm_result = json.loads(content)
            except:
                # If not valid JSON, extract key info
                content_lower = response.content.lower()
                is_fraud = any(word in content_lower for word in ['fraud', 'fraudulent', 'suspicious', 'malicious', 'spam'])
                
                llm_result = {
                    'is_fraud': is_fraud,
                    'confidence': 0.8 if is_fraud else 0.6,
                    'reasoning': response.content,
                    'method': 'LLM_REASONING'
                }
        else:
            llm_result = {
                'used': False,
                'reason': 'ML model confidence was high enough'
            }
        
        state['llm_analysis'] = llm_result
        state['messages'].append(f"LLM analysis: {llm_result}")
        
        return state
    
    def _build_llm_analysis_prompt(self, fraud_type: str, data: dict, ml_pred: dict) -> str:
        """Build the LLM analysis prompt"""
        
        base_prompt = f"""You are a professional fraud detection analyst explaining your findings to a client. Analyze this data naturally and provide clear, actionable insights.

Fraud Type: {fraud_type.replace('_', ' ').title()}
Data Provided: {json.dumps(data, indent=2)}
ML Model Analysis: {json.dumps(ml_pred, indent=2)}

Think through this step by step like a human expert would:

1. What patterns do you notice?
2. Are there any red flags or suspicious elements?
3. How does this compare to typical fraud cases?
4. What's your professional assessment?

"""
        
        if fraud_type == 'credit_card':
            specific_prompt = """For Credit Card Transactions, consider:
- Is the amount unusual (very high or very low)?
- Are there timing anomalies (late night, rapid succession)?
- Do the PCA features (V1-V28) show statistical anomalies?
- Are there patterns typical of stolen cards or account takeover?
"""
        elif fraud_type == 'email_spam':
            specific_prompt = """For Email/SMS Analysis, consider:
- Does the message use urgency tactics or create false scarcity?
- Are there obvious spam indicators (free money, prizes, "act now")?
- Does it request sensitive information or ask you to click suspicious links?
- Is the grammar and spelling professional or full of errors?
- Does it impersonate a legitimate organization?
"""
        elif fraud_type == 'url_fraud':
            specific_prompt = """For URL Analysis, consider:
- Does the domain look trustworthy or is it trying to impersonate a known brand?
- Are there suspicious patterns (excessive numbers, hyphens, misspellings)?
- Is it using HTTPS or the less secure HTTP?
- Does it contain phishing keywords (login, verify, update, secure, confirm)?
- Is the URL structure overly complex or obfuscated?
"""
        else:  # upi_fraud
            specific_prompt = """For UPI Transaction Analysis, consider:
- Is the amount reasonable for this type of transaction?
- Is the timing suspicious (unusual hours, rapid transactions)?
- Does the merchant category match the payment gateway used?
- Are there geographic risk factors?
- Is this transaction type common for fraud?
"""
        
        return base_prompt + specific_prompt + """

Now provide your professional assessment in clear, natural language.

Respond with a JSON object:
{
  "is_fraud": true or false,
  "confidence": 0.0 to 1.0 (how certain are you?),
  "risk_level": "LOW", "MEDIUM", "HIGH", or "CRITICAL",
  "reasoning": "Explain your assessment in 2-4 clear sentences, like you're talking to a client. Be specific about what you found.",
  "red_flags": ["List specific concerns you identified"],
  "recommendations": "What should be done about this? (1-2 sentences)",
  "method": "LLM_REASONING"
}

Write naturally and professionally. Avoid technical jargon where possible. Be clear and actionable."""
    
    def generate_final_result(self, state: FraudDetectionState) -> FraudDetectionState:
        """Generate the final structured result with natural language output in markdown format"""
        fraud_type = state['fraud_type']
        parsed_data = state['parsed_data']
        ml_prediction = state['ml_prediction']
        llm_analysis = state['llm_analysis']

        # Sanitize any free-text fields coming from the LLM to remove stray tokens
        if isinstance(llm_analysis, dict):
            if 'reasoning' in llm_analysis and isinstance(llm_analysis['reasoning'], str):
                llm_analysis['reasoning'] = self._clean_response_text(llm_analysis['reasoning'])
            if 'recommendations' in llm_analysis and isinstance(llm_analysis['recommendations'], str):
                llm_analysis['recommendations'] = self._clean_response_text(llm_analysis['recommendations'])
            if 'red_flags' in llm_analysis and isinstance(llm_analysis['red_flags'], (list, tuple)):
                llm_analysis['red_flags'] = [self._clean_response_text(str(f)) for f in llm_analysis.get('red_flags', [])]
        
        # Determine final verdict intelligently
        if ml_prediction['model_available'] and ml_prediction['confidence'] >= 0.7:
            # Trust ML model with high confidence
            is_fraud = ml_prediction['prediction'] == 1
            confidence = ml_prediction['confidence']
            method = 'ML_MODEL'
            
            # Create natural reasoning
            if is_fraud:
                reasoning = f"Our machine learning model detected **suspicious patterns** with **{confidence*100:.1f}% confidence**. This matches known fraud signatures in our database."
            else:
                reasoning = f"Our analysis shows this appears **legitimate** with **{confidence*100:.1f}% confidence**. No significant fraud indicators were detected."
                
        elif 'is_fraud' in llm_analysis:
            # Use LLM analysis
            is_fraud = llm_analysis['is_fraud']
            confidence = llm_analysis.get('confidence', 0.8)
            method = 'LLM_REASONING'
            reasoning = llm_analysis.get('reasoning', 'Analysis based on fraud detection patterns and expert knowledge.')
            
        elif ml_prediction['model_available']:
            # Hybrid: combine both with intelligent weighting
            ml_fraud = ml_prediction['prediction'] == 1
            ml_conf = ml_prediction['confidence']
            llm_fraud = llm_analysis.get('is_fraud', ml_fraud)
            llm_conf = llm_analysis.get('confidence', 0.5)
            
            # Weighted decision
            is_fraud = ml_fraud or llm_fraud
            confidence = max(ml_conf, llm_conf) if is_fraud else min(ml_conf, llm_conf)
            method = 'HYBRID'
            
            if is_fraud:
                reasoning = f"Both our **ML model ({ml_conf*100:.1f}%)** and **expert analysis** flagged this as suspicious. Multiple fraud indicators detected."
            else:
                reasoning = f"Our comprehensive analysis **(ML: {ml_conf*100:.1f}%, Expert review)** indicates this appears legitimate with no major concerns."
        else:
            # Graceful fallback
            is_fraud = False
            confidence = 0.5
            method = 'FALLBACK'
            reasoning = "Unable to perform full analysis with available data. Recommend manual review if this is a critical transaction."

        # Clean reasoning and recommendation text to strip stray tokens
        reasoning = self._clean_response_text(reasoning)
        
        # Determine risk level and recommendation naturally with markdown formatting
        if is_fraud:
            if confidence >= 0.9:
                risk_level = 'CRITICAL'
                recommendation = '## 🚨 IMMEDIATE ACTION REQUIRED\n\nBlock this transaction/content **immediately** and flag for urgent investigation. High probability of fraud detected.'
            elif confidence >= 0.75:
                risk_level = 'HIGH'
                recommendation = '## ⚠️ BLOCK AND REVIEW\n\nThis should be **blocked** and sent for manual review. Strong fraud indicators present.'
            elif confidence >= 0.6:
                risk_level = 'MEDIUM'
                recommendation = '## ⚡ FLAG FOR REVIEW\n\nThis shows suspicious patterns and should be reviewed by your security team before proceeding.'
            else:
                risk_level = 'LOW'
                recommendation = '## 🔍 INVESTIGATE\n\nLow confidence but suspicious — consider additional verification.'
        else:
            risk_level = 'LOW'
            recommendation = '## ✅ LIKELY SAFE\n\nAppears legitimate but with moderate confidence. Consider additional verification if high-value.'

        # Clean recommendation text as well
        recommendation = self._clean_response_text(recommendation)
        
        # Build comprehensive details
        details = {
            'input_data': parsed_data,
            'ml_prediction': ml_prediction if ml_prediction['model_available'] else None,
            'llm_analysis': llm_analysis if 'is_fraud' in llm_analysis else None,
            'processing_steps': state['messages'],
            'red_flags': llm_analysis.get('red_flags', []) if 'red_flags' in llm_analysis else []
        }
        
        # Add specific recommendations from LLM if available
        if 'recommendations' in llm_analysis:
            recommendation += f"\n\n### 💡 Additional Insights\n\n{llm_analysis['recommendations']}"
        
        # Create structured result
        result = FraudDetectionResult(
            fraud_type=fraud_type,
            is_fraud=is_fraud,
            confidence=confidence,
            risk_level=risk_level,
            detection_method=method,
            reasoning=reasoning,
            recommendation=recommendation,
            details=details
        )
        
        # Generate formatted markdown message for display
        fraud_type_labels = {
            'credit_card': '💳 Credit Card Fraud Detection',
            'email_spam': '📧 Email/SMS Spam Detection',
            'url_fraud': '🔗 URL/Phishing Detection',
            'upi_fraud': '💸 UPI Transaction Fraud Detection'
        }
        
        status_emoji = "🚨" if is_fraud else "✅"
        status_text = "**FRAUD DETECTED**" if is_fraud else "**APPEARS SAFE**"
        
        formatted_message = f"""# {fraud_type_labels.get(fraud_type, 'Fraud Detection')} Result

## {status_emoji} Status: {status_text}

**Type:** {fraud_type.upper().replace('_', ' ')}  
**Confidence:** {confidence*100:.1f}%  
**Risk Level:** {risk_level}  
**Detection Method:** {method.replace('_', ' ')}

---

### 🧠 Analysis

{reasoning}

---

{recommendation}
"""
        
        # Add red flags if any
        if details.get('red_flags'):
            formatted_message += "\n\n### 🚩 Red Flags Identified\n\n"
            for flag in details['red_flags']:
                formatted_message += f"- {flag}\n"
        
        result_dict = result.model_dump()

        # Ensure the formatted markdown doesn't contain stray LLM markers
        formatted_message = self._clean_response_text(formatted_message)
        result_dict['formatted_message'] = formatted_message

        state['final_result'] = result_dict

        return state
    
    def should_continue_to_fraud_detection(self, state: FraudDetectionState) -> str:
        """Determine if we should continue to fraud detection or end early"""
        fraud_type = state.get('fraud_type', '')
        
        # If it's a greeting, capability query, off_topic, or invalid, end early
        if fraud_type in ['greeting', 'capability', 'capability_query', 'off_topic', 'invalid_query', 'conversation', 'garbage']:
            return "end"
        return "continue"
    
    def build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(FraudDetectionState)
        
        # Add nodes
        workflow.add_node("validate", self.validate_input)
        workflow.add_node("classify", self.classify_fraud_type)
        workflow.add_node("parse", self.parse_input_data)
        workflow.add_node("ml_predict", self.run_ml_model)
        workflow.add_node("llm_analyze", self.llm_analysis)
        workflow.add_node("finalize", self.generate_final_result)
        
        # Set entry point to validation
        workflow.set_entry_point("validate")
        
        # Add conditional edge after validation
        workflow.add_conditional_edges(
            "validate",
            self.should_continue_to_fraud_detection,
            {
                "continue": "classify",
                "end": END
            }
        )
        
        # Add edges for fraud detection flow
        workflow.add_edge("classify", "parse")
        workflow.add_edge("parse", "ml_predict")
        workflow.add_edge("ml_predict", "llm_analyze")
        workflow.add_edge("llm_analyze", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()
    
    def detect_fraud(self, user_input: str) -> dict:
        """Main method to detect fraud"""
        initial_state = {
            'user_input': user_input,
            'fraud_type': '',
            'parsed_data': {},
            'ml_prediction': {},
            'llm_analysis': {},
            'final_result': {},
            'messages': []
        }
        
        # Run the graph
        final_state = self.graph.invoke(initial_state)
        
        return final_state['final_result']
    
    async def detect_fraud_stream(self, user_input: str):
        """Stream fraud detection results - yields chunks of the formatted message"""
        import asyncio
        
        initial_state = {
            'user_input': user_input,
            'fraud_type': '',
            'parsed_data': {},
            'ml_prediction': {},
            'llm_analysis': {},
            'final_result': {},
            'messages': []
        }
        
        # First, run the complete detection
        final_state = self.graph.invoke(initial_state)
        result = final_state['final_result']
        
        # Get the formatted message
        formatted_message = result.get('formatted_message', result.get('reasoning', ''))
        # Clean any stray tokens that may have been injected by the LLM
        formatted_message = self._clean_response_text(formatted_message)
        
        # Stream the message word by word for smooth effect
        words = formatted_message.split(' ')
        chunk_size = 3  # Send 3 words at a time
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            if i + chunk_size < len(words):
                chunk += ' '  # Add space between chunks
            
            yield {
                'type': 'content',
                'content': chunk,
                'is_complete': False
            }
            await asyncio.sleep(0.05)  # Small delay for streaming effect
        
        # Send complete signal with full result
        yield {
            'type': 'complete',
            'content': '',
            'is_complete': True,
            'result': result
        }


# ============================================
# MAIN EXECUTION
# ============================================

def main():
    """Main execution function"""
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Configuration
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    MODELS_BASE_PATH = os.getenv('MODELS_PATH', r'X:\Web Development\Nextjs_Projects\New folder\Models')
    
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY not found!")
        print("Please create a .env file with your API key or set the environment variable")
        print("Example: GOOGLE_API_KEY=your_key_here")
        return
    
    print("="*60)
    print("🔒 LANGGRAPH FRAUD DETECTION SYSTEM")
    print("="*60)
    
    # Initialize the fraud detection graph
    fraud_detector = FraudDetectionGraph(
        google_api_key=GOOGLE_API_KEY,
        models_base_path=MODELS_BASE_PATH
    )
    
    print("\n✓ System initialized successfully!")
    print("\n💬 I'm your AI fraud detection assistant!")
    print("   I can help you with:")
    print("   • Credit Card Transaction Analysis")
    print("   • Email/SMS Spam Detection")
    print("   • URL Fraud Verification")
    print("   • UPI Payment Fraud Detection")
    print("\nType your query or 'quit' to exit")
    print("-"*60)
    
    # Interactive loop
    while True:
        user_input = input("\n🔍 You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("\n👋 Goodbye! Stay safe from fraud!")
            break
        
        if not user_input:
            continue
        
        print("\n⏳ Analyzing...")
        
        try:
            # Detect fraud
            result = fraud_detector.detect_fraud(user_input)
            
            # Display result
            print("\n" + "="*60)
            
            # Check if it's a conversational response
            if result.get('details', {}).get('is_conversational', False):
                print("💬 ASSISTANT RESPONSE")
                print("="*60)
                print(f"\n{result['recommendation']}")
                print("\n" + "="*60)
            else:
                # Fraud detection result
                print("🔍 FRAUD DETECTION ANALYSIS")
                print("="*60)
                print(f"\n📋 Analysis Type: {result['fraud_type'].upper().replace('_', ' ')}")
                print(f"🔬 Detection Method: {result['detection_method']}")
                
                # Main verdict with emoji
                verdict_emoji = "🚨" if result['is_fraud'] else "✅"
                verdict_text = "FRAUD DETECTED" if result['is_fraud'] else "APPEARS LEGITIMATE"
                print(f"\n{verdict_emoji} {verdict_text}")
                
                print(f"📊 Confidence Level: {result['confidence']*100:.1f}%")
                print(f"⚠️  Risk Assessment: {result['risk_level']}")
                
                print(f"\n💭 Analysis:")
                print(f"   {result['reasoning']}")
                
                # Show red flags if any
                if result.get('details', {}).get('red_flags'):
                    print(f"\n🚩 Red Flags Identified:")
                    for flag in result['details']['red_flags']:
                        print(f"   • {flag}")
                
                print(f"\n📋 Recommendation:")
                # Handle multi-line recommendations
                rec_lines = result['recommendation'].split('\n')
                for line in rec_lines:
                    if line.strip():
                        print(f"   {line.strip()}")
                
                print("\n" + "="*60)
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()