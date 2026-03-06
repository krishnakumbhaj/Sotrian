"""
QR Code Fraud Detection Module
Reusable function for detecting fraud in QR codes
"""

import os
import cv2
import numpy as np
import joblib
from pyzbar.pyzbar import decode
from urllib.parse import urlparse
from typing import Dict, Tuple


class QRFraudDetector:
    """QR Code Fraud Detection Class"""
    
    def __init__(self, model_path: str = None):
        """Initialize the QR fraud detector"""
        if model_path is None:
            # Default path relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "qr_fraud_detection", "file_zip", "qr_fraud_model.pkl")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"QR fraud model not found at: {model_path}")
        
        self.model = joblib.load(model_path)
        print(f"✓ QR fraud model loaded from {model_path}")
    
    def extract_qr_features(self, image: np.ndarray) -> Dict:
        """Extract features from QR code image"""
        features = {}
        
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Basic image features
        features["height"], features["width"] = gray.shape
        features["mean_intensity"] = float(np.mean(gray))
        features["std_intensity"] = float(np.std(gray))
        features["edge_density"] = float(np.mean(cv2.Canny(gray, 100, 200)) / 255)
        
        # Black/white ratio
        white = np.sum(gray >= 128)
        black = np.sum(gray < 128)
        features["black_white_ratio"] = float((black / white) if white > 0 else 0)
        
        # Decode QR code
        decoded = decode(image)
        if decoded:
            try:
                data = decoded[0].data.decode("utf-8", errors="ignore")
            except Exception:
                data = ""
            
            features["decoded_data"] = data
            features["data_length"] = len(data)
            features["contains_url"] = int("http" in data or "https" in data)
            
            if features["contains_url"]:
                try:
                    domain = urlparse(data).netloc
                    features["domain_length"] = len(domain)
                except:
                    features["domain_length"] = 0
            else:
                features["domain_length"] = 0
        else:
            features.update({
                "decoded_data": "",
                "data_length": 0,
                "contains_url": 0,
                "domain_length": 0
            })
        
        return features
    
    def predict_fraud(self, image: np.ndarray) -> Tuple[bool, float, Dict]:
        """
        Predict if QR code is fraudulent
        
        Args:
            image: numpy array of the QR code image
            
        Returns:
            Tuple of (is_fraud, confidence, details)
        """
        # Extract features
        features = self.extract_qr_features(image)
        
        # Prepare feature vector for model
        X = [[
            features["height"],
            features["width"],
            features["mean_intensity"],
            features["std_intensity"],
            features["edge_density"],
            features["black_white_ratio"],
            features["data_length"],
            features["contains_url"],
            features["domain_length"]
        ]]
        
        # Get prediction
        try:
            proba = self.model.predict_proba(X)[0]
            fraud_probability = proba[1]  # Probability of fraud class
            legit_probability = proba[0]  # Probability of legitimate class
            
            # Determine if fraud based on threshold
            is_fraud = fraud_probability > 0.5
            confidence = fraud_probability if is_fraud else legit_probability
            
            details = {
                "fraud_probability": float(fraud_probability),
                "legit_probability": float(legit_probability),
                "decoded_data": str(features.get("decoded_data", "")),
                "contains_url": bool(int(features.get("contains_url", 0))),
                "data_length": int(features.get("data_length", 0)),
                "qr_features": features
            }
            
            return bool(is_fraud), float(confidence), details
            
        except Exception as e:
            raise Exception(f"Error during QR fraud prediction: {str(e)}")
    
    def detect_fraud_from_base64(self, image_base64: str) -> Dict:
        """
        Detect fraud from base64 encoded image
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            Dict with detection results
        """
        import base64
        
        # Decode base64 to image
        try:
            # Remove data:image/png;base64, prefix if present
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            img_data = base64.b64decode(image_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            # Predict fraud
            is_fraud, confidence, details = self.predict_fraud(image)
            
            # Determine risk level
            if is_fraud:
                if confidence >= 0.9:
                    risk_level = "CRITICAL"
                elif confidence >= 0.75:
                    risk_level = "HIGH"
                elif confidence >= 0.6:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "LOW"
            else:
                risk_level = "LOW"
            
            # Generate reasoning
            if is_fraud:
                reasoning = f"QR code shows suspicious patterns with {confidence*100:.1f}% confidence. "
                if details.get("contains_url"):
                    reasoning += f"The QR code contains a URL: {details['decoded_data'][:50]}... which may be a phishing attempt."
                else:
                    reasoning += "The visual pattern and data structure match known fraud signatures."
            else:
                reasoning = f"QR code appears legitimate with {confidence*100:.1f}% confidence. "
                if details.get("decoded_data"):
                    reasoning += f"Decoded content: {details['decoded_data'][:100]}"
                else:
                    reasoning += "No suspicious indicators detected."
            
            # Generate recommendation
            if is_fraud:
                if risk_level in ["CRITICAL", "HIGH"]:
                    recommendation = "⚠️ DO NOT SCAN THIS QR CODE. Block and report this as potential fraud. The QR code shows strong indicators of malicious intent."
                else:
                    recommendation = "⚠️ Exercise caution. This QR code shows suspicious characteristics. Verify the source before proceeding."
            else:
                recommendation = "✅ QR code appears safe. However, always verify the source and destination before scanning unknown QR codes."
            
            # Ensure all values are JSON-serializable (convert numpy types to Python types)
            return {
                "fraud_type": "qr_fraud",
                "is_fraud": bool(is_fraud),
                "confidence": float(confidence),
                "risk_level": str(risk_level),
                "detection_method": "ML_MODEL",
                "reasoning": str(reasoning),
                "recommendation": str(recommendation),
                "details": {
                    "fraud_probability": float(details.get("fraud_probability", 0)),
                    "legit_probability": float(details.get("legit_probability", 0)),
                    "decoded_data": str(details.get("decoded_data", "")),
                    "contains_url": bool(details.get("contains_url", False)),
                    "data_length": int(details.get("data_length", 0))
                }
            }
            
        except Exception as e:
            return {
                "fraud_type": "qr_fraud",
                "is_fraud": False,
                "confidence": 0.0,
                "risk_level": "N/A",
                "detection_method": "ERROR",
                "reasoning": f"Error processing QR code: {str(e)}",
                "recommendation": "Unable to analyze QR code. Please ensure the image is clear and contains a valid QR code.",
                "details": {"error": str(e)}
            }
    
    def detect_fraud_from_file(self, file_path: str) -> Dict:
        """
        Detect fraud from image file path
        
        Args:
            file_path: Path to the QR code image file
            
        Returns:
            Dict with detection results
        """
        try:
            # Read image
            image = cv2.imread(file_path)
            
            if image is None:
                raise ValueError(f"Failed to load image from {file_path}")
            
            # Predict fraud
            is_fraud, confidence, details = self.predict_fraud(image)
            
            # Same processing as detect_fraud_from_base64
            if is_fraud:
                if confidence >= 0.9:
                    risk_level = "CRITICAL"
                elif confidence >= 0.75:
                    risk_level = "HIGH"
                elif confidence >= 0.6:
                    risk_level = "MEDIUM"
                else:
                    risk_level = "LOW"
            else:
                risk_level = "LOW"
            
            if is_fraud:
                reasoning = f"QR code shows suspicious patterns with {confidence*100:.1f}% confidence. "
                if details.get("contains_url"):
                    reasoning += f"The QR code contains a URL which may be a phishing attempt."
                else:
                    reasoning += "The visual pattern and data structure match known fraud signatures."
            else:
                reasoning = f"QR code appears legitimate with {confidence*100:.1f}% confidence. No suspicious indicators detected."
            
            if is_fraud:
                if risk_level in ["CRITICAL", "HIGH"]:
                    recommendation = "⚠️ DO NOT SCAN THIS QR CODE. Block and report this as potential fraud."
                else:
                    recommendation = "⚠️ Exercise caution. This QR code shows suspicious characteristics."
            else:
                recommendation = "✅ QR code appears safe. Always verify the source before scanning."
            
            return {
                "fraud_type": "qr_fraud",
                "is_fraud": is_fraud,
                "confidence": confidence,
                "risk_level": risk_level,
                "detection_method": "ML_MODEL",
                "reasoning": reasoning,
                "recommendation": recommendation,
                "details": details
            }
            
        except Exception as e:
            return {
                "fraud_type": "qr_fraud",
                "is_fraud": False,
                "confidence": 0.0,
                "risk_level": "N/A",
                "detection_method": "ERROR",
                "reasoning": f"Error processing QR code: {str(e)}",
                "recommendation": "Unable to analyze QR code.",
                "details": {"error": str(e)}
            }


# Test function
def test_qr_detector():
    """Test the QR detector"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python qr_detector.py <image_path>")
        return
    
    image_path = sys.argv[1]
    
    try:
        detector = QRFraudDetector()
        result = detector.detect_fraud_from_file(image_path)
        
        print("\n" + "="*60)
        print("QR CODE FRAUD DETECTION RESULT")
        print("="*60)
        print(f"Is Fraud: {result['is_fraud']}")
        print(f"Confidence: {result['confidence']*100:.1f}%")
        print(f"Risk Level: {result['risk_level']}")
        print(f"\nReasoning: {result['reasoning']}")
        print(f"\nRecommendation: {result['recommendation']}")
        print("="*60)
        
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    test_qr_detector()
