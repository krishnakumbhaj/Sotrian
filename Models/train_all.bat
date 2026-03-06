@echo off
echo ====================================================================
echo TRAINING ALL FRAUD DETECTION MODELS
echo ====================================================================
echo.

echo 1. Training Credit Card Fraud Model...
cd Credit_card
python app.py
if errorlevel 1 (
    echo [ERROR] Credit Card model training failed
) else (
    echo [SUCCESS] Credit Card model trained
)
cd ..
echo.

echo 2. Training Email Spam Detection Model...
cd Emails_Spam
python app.py
if errorlevel 1 (
    echo [ERROR] Email Spam model training failed
) else (
    echo [SUCCESS] Email Spam model trained
)
cd ..
echo.

echo 3. Training URL Fraud Detection Model...
cd URL_fraud
python app.py
if errorlevel 1 (
    echo [ERROR] URL Fraud model training failed
) else (
    echo [SUCCESS] URL Fraud model trained
)
cd ..
echo.

echo 4. Training UPI Fraud Detection Model...
cd UPI-fraud
if exist app.py (
    python app.py
    if errorlevel 1 (
        echo [ERROR] UPI Fraud model training failed
    ) else (
        echo [SUCCESS] UPI Fraud model trained
    )
) else (
    echo [SKIP] No training script found for UPI Fraud
)
cd ..
echo.

echo ====================================================================
echo TRAINING COMPLETE
echo ====================================================================
echo.
echo Check above for any errors. If all models trained successfully,
echo restart the FastAPI server to use the new models.
echo.
pause
