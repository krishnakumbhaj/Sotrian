# ======================================
# 🧠 QR Code Fraud Detection System - Final Clean Version (No Live Scanner)
# ======================================

import os
import cv2
import numpy as np
import pandas as pd
import streamlit as st
import joblib
from pyzbar.pyzbar import decode
from urllib.parse import urlparse
from sklearn.metrics import accuracy_score, confusion_matrix

# -----------------------------
# Page Configuration
# -----------------------------
st.set_page_config(page_title="QR Code Fraud Detector", layout="wide")
st.title("🔍 QR Code Fraud Detection System")
st.markdown("""
Upload a QR code to check whether it is **Legitimate ✅**, **Fraudulent 🚨**,  
or **Uncertain ???** (low-confidence case).  
The model uses both **visual** and **data-based** QR features.
""")

# -----------------------------
# Load Trained Model
# -----------------------------
MODEL_PATH = "qr_fraud_model.pkl"
if not os.path.exists(MODEL_PATH):
    st.error("❌ Model file 'qr_fraud_model.pkl' not found! Please train and save it first.")
    st.stop()

model = joblib.load(MODEL_PATH)
st.sidebar.success("✅ Model Loaded Successfully!")

# -----------------------------
# Feature Extraction Function
# -----------------------------
def extract_qr_features(image):
    """Extracts numeric + text-based QR features from an image."""
    features = {}
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    features["height"], features["width"] = gray.shape
    features["mean_intensity"] = float(np.mean(gray))
    features["std_intensity"] = float(np.std(gray))
    features["edge_density"] = float(np.mean(cv2.Canny(gray, 100, 200)) / 255)

    white = np.sum(gray >= 128)
    black = np.sum(gray < 128)
    features["black_white_ratio"] = float((black / white) if white > 0 else 0)

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
            domain = urlparse(data).netloc
            features["domain_length"] = len(domain)
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

# -----------------------------
# Sidebar - Model Evaluation
# -----------------------------
st.sidebar.header("📊 Model Evaluation (Optional)")
if st.sidebar.button("Show Accuracy Report"):
    try:
        df = pd.read_csv("qr_features.csv")
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        df["label_encoded"] = le.fit_transform(df["label"])
        X = df[["height","width","mean_intensity","std_intensity","edge_density",
                "black_white_ratio","data_length","contains_url","domain_length"]]
        y = df["label_encoded"]
        from sklearn.model_selection import train_test_split
        X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.25,random_state=42,stratify=y)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test,y_pred)
        st.sidebar.success(f"🎯 Accuracy: {acc*100:.2f}%")
        st.sidebar.dataframe(pd.DataFrame(confusion_matrix(y_test,y_pred),
                                          index=["Actual Legit","Actual Fraud"],
                                          columns=["Pred Legit","Pred Fraud"]))
    except Exception as e:
        st.sidebar.error(f"⚠️ Error: {e}")

# -----------------------------
# QR Image Upload + Prediction
# -----------------------------
st.header("📤 Upload a QR Code Image")
file = st.file_uploader("Choose a QR image", type=["png","jpg","jpeg"])

if file is not None:
    arr = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    st.image(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), caption="🖼️ Uploaded QR Code", width=350)

    # --- Extract and Predict ---
    f = extract_qr_features(img)
    X = [[f["height"],f["width"],f["mean_intensity"],f["std_intensity"],
          f["edge_density"],f["black_white_ratio"],f["data_length"],
          f["contains_url"],f["domain_length"]]]
    proba = model.predict_proba(X)[0][1]
    fraud_conf, legit_conf = proba*100, (1-proba)*100

    # --- Display Result ---
    if fraud_conf > 70:
        st.error(f"🚨 Fraudulent ({fraud_conf:.1f}%)")
    elif legit_conf > 70:
        st.success(f"✅ Legitimate ({legit_conf:.1f}%)")
    else:
        st.warning(f"❓ Uncertain ({max(fraud_conf, legit_conf):.1f}%)")

    # --- Explanation Section ---
    st.markdown("### 📘 Explanation")
    if fraud_conf > 70:
        st.write("⚠️ The QR code pattern or data seems suspicious — possible phishing or tampering.")
    elif legit_conf > 70:
        st.write("✅ QR pattern and content align with legitimate samples.")
    else:
        st.write("🟡 Model not confident enough; try scanning again in better lighting.")

    # --- Show Extracted Features ---
    with st.expander("📄 Extracted Features"):
        st.json(f)
