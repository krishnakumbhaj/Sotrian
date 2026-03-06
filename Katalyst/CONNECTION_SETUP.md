# 🔗 Next.js ↔ FastAPI Connection Configuration

## ✅ Current Setup

### 🔐 API Key Flow (ENCRYPTED)

```
User's Google API Key
         ↓
1. User enters in Next.js Settings Page
         ↓
2. Next.js encrypts with AES-256-CBC
   • Algorithm: aes-256-cbc
   • Secret: API_KEY_ENCRYPTION_SECRET (32 chars)
   • Random IV per encryption
         ↓
3. Stored ENCRYPTED in MongoDB
         ↓
4. When user sends query, Next.js API:
   • Retrieves encrypted key from MongoDB
   • DECRYPTS using decryptApiKey()
   • Sends DECRYPTED key to FastAPI
         ↓
5. FastAPI receives PLAIN TEXT key
   • Uses directly with Google Gemini
   • Never stores it
         ↓
6. After request completes, key discarded
```

**✅ Code Verification:**

In `Katalyst/src/app/api/chat/[chatId]/route.ts`:
```typescript
// Line 135 - API key is properly decrypted before sending
google_api_key: decryptApiKey(user.googleApiKey),  // ✅ DECRYPTED
```

---

## 🌐 CORS Configuration

### FastAPI Server (`Models/fastapi_server.py`)

**Current Configuration:**
```python
# Allow Next.js origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000"
]

# In development: allow_origins=["*"] (all origins)
# In production: specify exact Next.js URLs
```

**Methods Allowed:** GET, POST, PUT, DELETE, OPTIONS  
**Headers:** All headers allowed  
**Credentials:** Enabled (for cookies/sessions)

---

## 📡 Connection Endpoints

### From Next.js → FastAPI

**Base URL:** `http://localhost:8000` (development)

**Main Endpoint Used:**
```typescript
POST http://localhost:8000/api/detect

Request Body:
{
  "query": string,                    // User's fraud detection query
  "google_api_key": string,          // ✅ DECRYPTED API key
  "user_info": {
    "username": string,
    "email": string,
    "user_id": string
  },
  "session_id": string                // Chat ID for tracking
}

Response:
{
  "success": boolean,
  "timestamp": string,
  "user_info": { ... },
  "query": string,
  "result": {
    "fraud_type": string,
    "is_fraud": boolean,
    "confidence": number,
    "risk_level": string,
    "detection_method": string,
    "reasoning": string,
    "recommendation": string,
    "details": { ... }
  },
  "processing_time_ms": number
}
```

---

## 🔧 Environment Variables

### Next.js (`.env.local`)
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/fraud_detection

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# API Key Encryption (REQUIRED)
API_KEY_ENCRYPTION_SECRET=your-32-character-secret-key!!

# FastAPI URL (REQUIRED)
FASTAPI_URL=http://localhost:8000
```

### FastAPI (`.env`)
```env
# Google API Key (optional, user provides their own)
# GOOGLE_API_KEY=your-fallback-key

# Models Path
MODELS_PATH=X:\Web Development\Nextjs_Projects\New folder\Models

# CORS (optional, for production)
# ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🔍 Debugging Connection Issues

### Issue 1: CORS Error
**Error:** `Access to fetch at 'http://localhost:8000/api/detect' from origin 'http://localhost:3000' has been blocked by CORS`

**Solution:**
```python
# In fastapi_server.py, verify CORS middleware includes:
allow_origins=["http://localhost:3000"],
allow_credentials=True,
```

### Issue 2: Connection Refused
**Error:** `fetch failed - connection refused`

**Solution:**
1. Start FastAPI server:
   ```bash
   cd Models
   python fastapi_server.py
   ```
2. Verify it's running on port 8000
3. Check `FASTAPI_URL` in Next.js `.env.local`

### Issue 3: API Key Decryption Error
**Error:** `Incorrect decryption`

**Solution:**
1. Verify `API_KEY_ENCRYPTION_SECRET` is exactly 32 characters
2. Must be the SAME in both encryption and decryption
3. Check it matches in `.env.local`

### Issue 4: Invalid API Key Format
**Error:** `Invalid Google API key format`

**Solution:**
1. Google API keys start with `AIza`
2. Typically 39 characters long
3. No spaces or special characters
4. Generate from: https://console.cloud.google.com/apis/credentials

---

## 🧪 Testing Connection

### Step 1: Test FastAPI Directly
```bash
curl -X POST http://localhost:8000/api/detect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Check this email: WIN FREE PRIZE!",
    "google_api_key": "AIzaSyYourRealKeyHere",
    "user_info": {
      "username": "test_user",
      "email": "test@example.com",
      "user_id": "test123"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "fraud_type": "email_spam",
    "is_fraud": true,
    "confidence": 0.95,
    ...
  }
}
```

### Step 2: Test Next.js API
```bash
# First, login and get session cookie
# Then test chat endpoint
curl -X POST http://localhost:3000/api/chat/CHAT_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "message": "Check this email: WIN FREE PRIZE!"
  }'
```

### Step 3: Test Through Frontend
1. Open Next.js: `http://localhost:3000`
2. Login
3. Go to Settings → Add Google API key
4. Create new chat
5. Send fraud detection query
6. Check browser console for network requests

---

## 📊 Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER ACTION                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend (localhost:3000)                          │
│  • User sends message: "Check this email: WIN PRIZE"        │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/chat/[chatId]
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route                                          │
│  1. Get user from MongoDB                                   │
│  2. Check if user.googleApiKey exists                       │
│  3. DECRYPT: decryptApiKey(user.googleApiKey)              │
│     • Input:  "a1b2c3:4d5e6f..."  (encrypted)              │
│     • Output: "AIzaSyC...ABC123"  (plain text)             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP POST
                     │ Body: {
                     │   query: "Check this email...",
                     │   google_api_key: "AIzaSyC...ABC123",  ← PLAIN TEXT
                     │   user_info: {...}
                     │ }
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Server (localhost:8000)                            │
│  • Receives DECRYPTED API key                               │
│  • Creates LangGraph instance                               │
│  • Initializes Gemini with user's API key                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  LangGraph Fraud Detection                                  │
│  • Validates query                                          │
│  • Classifies fraud type                                    │
│  • Runs ML model or LLM                                     │
│  • Generates result                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Google Gemini API                                          │
│  • Uses user's API key                                      │
│  • Charges to user's quota                                  │
│  • Returns LLM response                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI Response                                           │
│  {                                                          │
│    success: true,                                           │
│    result: {                                                │
│      fraud_type: "email_spam",                              │
│      is_fraud: true,                                        │
│      confidence: 0.95,                                      │
│      reasoning: "...",                                      │
│      recommendation: "..."                                  │
│    }                                                        │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route                                          │
│  • Formats response                                         │
│  • Saves to MongoDB chat history                            │
│  • Returns to frontend                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                           │
│  • Displays result in chat                                  │
│  • Shows fraud status, confidence, recommendation           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Security Checklist

- [x] API keys encrypted in MongoDB (AES-256-CBC)
- [x] Keys decrypted only when needed
- [x] Decrypted keys sent over localhost (or HTTPS in production)
- [x] FastAPI never stores API keys
- [x] Keys discarded after each request
- [x] CORS configured for specific origins
- [x] User authentication required (NextAuth)
- [x] User can only access their own data
- [x] Environment secrets not in code

---

## 🚀 Production Considerations

### 1. Use HTTPS
```env
# Production .env.local
FASTAPI_URL=https://api.yourdomain.com
```

### 2. Restrict CORS
```python
# Production fastapi_server.py
ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
]
```

### 3. Add Rate Limiting
```python
# Add to FastAPI
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/detect")
@limiter.limit("10/minute")
async def detect_fraud(...):
    ...
```

### 4. Monitor API Usage
- Log all requests
- Track user API key usage
- Alert on suspicious patterns
- Implement usage quotas

---

## 📞 Support

If connection issues persist:

1. Check both servers are running:
   - Next.js: `npm run dev` (port 3000)
   - FastAPI: `python fastapi_server.py` (port 8000)

2. Verify environment variables:
   ```bash
   # Next.js
   cat Katalyst/.env.local | grep FASTAPI_URL
   
   # FastAPI  
   cat Models/.env | grep MODELS_PATH
   ```

3. Test FastAPI directly with curl (see Testing section)

4. Check browser console for CORS errors

5. Verify API key is valid at https://console.cloud.google.com

---

**✅ Connection Configured! Next.js can now securely communicate with FastAPI! 🔗**
