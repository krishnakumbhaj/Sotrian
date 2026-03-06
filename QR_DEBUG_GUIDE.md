# 🔍 QR Detection Debug Guide

## Problem
QR code images are being processed as URL fraud detection instead of QR fraud detection.

## Debug Logging Added

I've added comprehensive debug logging at **EVERY** step of the flow to track where the image data is lost:

### 1. 🖼️ Frontend (Sotrian.ai/page.tsx)
**Lines ~545-575**
```typescript
// Logs when file is converted to base64
console.log('FILE TO BASE64 CONVERSION');
console.log(`File name: ${files[0].name}`);
console.log(`Base64 length: ${imageBase64.length} characters`);

// Logs before sending to API
console.log('SENDING TO API');
console.log(`Has Image: ${!!imageBase64}`);
```

### 2. 📨 Next.js API Route (stream/route.ts)
**Lines ~30-40**
```typescript
// Logs what Next.js receives
console.log('NEXT.JS API ROUTE');
console.log(`Image Present: ${!!image}`);
console.log(`Image Length: ${image?.length || 0} bytes`);
console.log(`Image starts with: ${image.substring(0, 50)}...`);

// Logs before sending to FastAPI
console.log('SENDING TO FASTAPI');
console.log(`Image in body: ${!!fastApiBody.image}`);
```

### 3. 🐍 FastAPI Backend (main.py)
**Lines ~245 & ~360**
```python
# Logs what FastAPI receives
print("RECEIVED REQUEST AT /api/detect/stream")
print(f"Query: {request.query[:50]}...")
print(f"Image Present: {bool(request.image)}")
print(f"Image Size: {len(request.image)} bytes")
print(f"QR Detector Available: {QR_DETECTOR_AVAILABLE}")

# If QR branch is entered
print("ENTERING QR DETECTION BRANCH")
```

## 🧪 Testing Instructions

### Step 1: Start Your Servers

**Terminal 1 - FastAPI (Watch Python logs)**
```bash
cd Models
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Next.js (Watch Node logs)**
```bash
cd Katalyst
npm run dev
```

### Step 2: Upload QR Code

1. Open the chat interface
2. Click the image upload button (📷)
3. Select a QR code image
4. Type a message like "Is this QR code safe?"
5. Send the message

### Step 3: Check Console Logs

**Browser Console (F12):**
Look for:
```
==================================================
🖼️ FRONTEND - FILE TO BASE64 CONVERSION
  📁 File name: qr-code.png
  📏 File size: 12345 bytes
  ✅ Base64 length: 16460 characters
  🔍 Base64 starts with: data:image/png;base64,iVBORw0K...
==================================================

==================================================
📤 FRONTEND - SENDING TO API
  📝 Query: "Is this QR code safe?"
  🖼️  Has Image: true
  📏 Image Size: 16460 chars
==================================================
```

**Next.js Terminal:**
Look for:
```
================================================================================
📨 NEXT.JS API ROUTE - /api/chat/[chatId]/stream
  📝 Message: "Is this QR code safe?"
  🖼️  Image Present: true
  📏 Image Length: 16460 bytes
  🔍 Image starts with: data:image/png;base64,iVBORw0K...
================================================================================

📤 SENDING TO FASTAPI: http://localhost:8000/api/detect/stream
  🖼️  Image in body: true
  📏 Image size: 16460 bytes
```

**FastAPI Terminal:**
Look for:
```
================================================================================
📥 RECEIVED REQUEST AT /api/detect/stream
  📝 Query: Is this QR code safe?
  🖼️  Image Present: true
  📏 Image Size: 16460 bytes
  🤖 QR Detector Available: True
  👤 User: john@example.com
================================================================================

🎯 ENTERING QR DETECTION BRANCH
📸 Running QR fraud detection on image...
✅ QR Detection complete - Is Fraud: True/False, Confidence: 95.0%
✅ LLM formatting complete
✅ QR streaming complete
```

## 🐛 Troubleshooting

### Issue 1: "Image Present: false" in Next.js logs
**Problem:** Image not being uploaded properly from frontend
**Solution:** Check file input, ensure file is selected before sending

### Issue 2: "Image Present: true" in Next.js but "false" in FastAPI
**Problem:** Image data lost during transmission to FastAPI
**Possible causes:**
- JSON serialization issue
- Image too large (>5MB limit?)
- Base64 encoding problem

### Issue 3: QR Detector shows "Available: False"
**Problem:** QR detector module not loaded
**Solution:** Check QR-Spam folder exists with model file

### Issue 4: Goes to URL detection instead of QR detection
**Problem:** Image is None/empty when reaching FastAPI
**Solution:** Follow the logs backward to find where image data disappears

## 🎯 Expected Flow

✅ **Correct Flow:**
```
Frontend uploads file → Converts to base64 → Sends to Next.js API
→ Next.js API receives image → Forwards to FastAPI
→ FastAPI receives image → Enters QR detection branch
→ QR detector analyzes → LLM formats response → Streams to user
```

❌ **Wrong Flow (Current Issue):**
```
Frontend uploads file → ??? → FastAPI receives NO image
→ Falls back to text-based detection → Classifies as URL fraud
```

## 📊 What to Report

After testing, report:

1. **Which step shows "Image Present: false"** (this is where data is lost)
2. **Full console output** from browser, Next.js, and FastAPI terminals
3. **File details**: Type, size, name of QR code you're uploading
4. **Any errors** in any of the terminals

## 🔧 Quick Fixes to Try

If image is being lost:

1. **Check file size limit:**
   ```typescript
   // In page.tsx, increase limit if needed
   if (file.size > 10 * 1024 * 1024) { // Change to 10MB
   ```

2. **Check CORS:**
   ```python
   # In main.py, ensure CORS allows image data
   ```

3. **Verify base64 encoding:**
   ```typescript
   // Ensure fileToBase64 includes data:image prefix
   ```

---

Now test and watch the logs! The debug output will show EXACTLY where the image data disappears. 🕵️
