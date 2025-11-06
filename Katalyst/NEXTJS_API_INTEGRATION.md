# 🎯 Next.js API Routes - Fraud Detection Integration

## ✅ What's Been Updated

### 📦 Models

#### 1. **User Model** (`src/models/User.ts`)
```typescript
export interface User extends Document {
  username: string;
  email: string;
  password: string;
  googleApiKey?: string;  // 🆕 Encrypted Google API key
  createdAt: Date;
  updatedAt: Date;       // 🆕 Track updates
}
```

**Changes:**
- ✅ Added `googleApiKey` field for storing encrypted API keys
- ✅ Added `updatedAt` timestamp
- ✅ Added pre-save hook to update timestamp

---

#### 2. **Chat Model** (`src/models/Chat.ts`)
```typescript
export interface FraudDetectionResult {
  fraud_type: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud' | ...;
  is_fraud: boolean;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'N/A';
  detection_method: 'ML_MODEL' | 'LLM_REASONING' | 'HYBRID' | ...;
  reasoning: string;
  recommendation: string;
  details?: { ... };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  
  // 🆕 Fraud detection fields
  fraudDetectionResult?: FraudDetectionResult;
  processingTimeMs?: number;
  queryType?: 'fraud_detection' | 'greeting' | 'capability' | 'invalid';
  fraudType?: 'credit_card' | 'email_spam' | 'url_fraud' | 'upi_fraud';
}
```

**Changes:**
- ✅ Removed SQL-related fields (sqlQuery, data, visualizationData)
- ✅ Added `FraudDetectionResult` interface matching FastAPI response
- ✅ Added fraud detection specific fields to Message

---

### 🔐 Security

#### 3. **Encryption Utility** (`src/lib/encryption.ts`) - 🆕 NEW FILE
```typescript
export function encryptApiKey(apiKey: string): string
export function decryptApiKey(encryptedApiKey: string): string
```

**Features:**
- ✅ AES-256-CBC encryption for API keys
- ✅ Random IV for each encryption
- ✅ Secure key storage via environment variable

**Environment Variable Required:**
```env
API_KEY_ENCRYPTION_SECRET=your-32-character-secret-key-here
```

---

### 📡 API Routes

#### 4. **API Key Management** (`src/app/api/user/api-key/route.ts`) - 🆕 NEW FILE

**Endpoints:**

##### GET - Check if API key exists
```typescript
GET /api/user/api-key
Response: {
  success: true,
  hasApiKey: boolean,
  maskedKey: string | null  // "AIzaSy...Ab12"
}
```

##### POST - Save/Update API key
```typescript
POST /api/user/api-key
Body: { apiKey: string }
Response: {
  success: true,
  message: string,
  maskedKey: string
}
```

##### DELETE - Remove API key
```typescript
DELETE /api/user/api-key
Response: {
  success: true,
  message: string
}
```

**Validation:**
- ✅ Checks API key format (starts with "AIza")
- ✅ Minimum length validation
- ✅ Encrypts before storing

---

#### 5. **Chat Routes** (`src/app/api/chat/route.ts`)

**Updated:**
- ✅ Changed default title from "New Database Query" to "New Fraud Detection Chat"
- ✅ Everything else remains the same (GET, POST, DELETE)

---

#### 6. **Chat Message Routes** (`src/app/api/chat/[chatId]/route.ts`)

**Major Rewrite of POST endpoint:**

```typescript
POST /api/chat/[chatId]
Body: { message: string }
```

**Flow:**
1. ✅ Validates user session
2. ✅ Checks if user has Google API key configured
3. ✅ Adds user message to chat
4. ✅ **Calls FastAPI** for fraud detection:
   ```typescript
   fetch(`${FASTAPI_URL}/api/detect`, {
     method: 'POST',
     body: JSON.stringify({
       query: message,
       google_api_key: decryptApiKey(user.googleApiKey),
       user_info: { username, email, user_id },
       session_id: chatId
     })
   })
   ```
5. ✅ Formats fraud detection result into readable response
6. ✅ Saves assistant message with fraud data
7. ✅ Returns result to frontend

**Response Format:**
```typescript
{
  success: true,
  messageId: string,
  fraudResult: FraudDetectionResult,
  processingTimeMs: number,
  chat: {
    id: string,
    title: string,
    updatedAt: Date,
    messageCount: number
  }
}
```

**Error Handling:**
- ✅ Returns 400 if user has no API key
- ✅ Returns 503 if FastAPI is unavailable
- ✅ Adds error message to chat history

---

## 🏗️ Architecture Flow

```
User → Next.js Frontend
         ↓
    Next.js API Routes (Chat)
         ↓
    1. Get user's encrypted API key from MongoDB
    2. Decrypt API key
    3. Send to FastAPI with user info
         ↓
    FastAPI Server (localhost:8000)
         ↓
    LangGraph + ML Models + Gemini
         ↓
    Return fraud detection result
         ↓
    Next.js API Routes
         ↓
    Save to MongoDB + Return to Frontend
```

---

## 🔑 Environment Variables Needed

Update `.env` or `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/fraud_detection

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# API Key Encryption (🆕 NEW)
API_KEY_ENCRYPTION_SECRET=your-32-character-secret-key!!

# FastAPI URL (🆕 NEW)
FASTAPI_URL=http://localhost:8000
```

---

## 📝 Frontend Integration Needed

### Settings Page Component

You'll need to create a settings page where users can manage their API key:

```typescript
// Example: src/app/settings/page.tsx
'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  
  const saveApiKey = async () => {
    const res = await fetch('/api/user/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const data = await res.json();
    if (data.success) {
      alert('API key saved!');
      setHasKey(true);
    }
  };
  
  return (
    <div>
      <h1>Settings</h1>
      <div>
        <label>Google Gemini API Key</label>
        <input 
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
        />
        <button onClick={saveApiKey}>Save</button>
      </div>
      {hasKey && <p>✅ API key configured</p>}
    </div>
  );
}
```

### Chat Interface Component

The chat component should display fraud detection results nicely:

```typescript
// Display fraud result in chat
{message.role === 'assistant' && message.fraudDetectionResult && (
  <div className={`fraud-result ${message.fraudDetectionResult.is_fraud ? 'fraud' : 'safe'}`}>
    <div className="fraud-status">
      {message.fraudDetectionResult.is_fraud ? '🚨 FRAUD' : '✅ SAFE'}
    </div>
    <div className="confidence">
      Confidence: {(message.fraudDetectionResult.confidence * 100).toFixed(1)}%
    </div>
    <div className="risk-level">
      Risk: {message.fraudDetectionResult.risk_level}
    </div>
  </div>
)}
```

---

## 🧪 Testing the APIs

### 1. Test API Key Management

```bash
# Check if user has API key
curl -X GET http://localhost:3000/api/user/api-key \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"

# Save API key
curl -X POST http://localhost:3000/api/user/api-key \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"apiKey":"AIzaSyYourApiKeyHere"}'
```

### 2. Test Chat with Fraud Detection

```bash
# Create new chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"title":"Test Fraud Detection"}'

# Send message for fraud detection
curl -X POST http://localhost:3000/api/chat/CHAT_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"message":"Check this email: WIN FREE PRIZE NOW!"}'
```

---

## ✅ Checklist

### Backend (API Routes) - COMPLETE ✅
- [x] Updated User model with googleApiKey field
- [x] Updated Chat model with fraud detection fields
- [x] Created encryption utility
- [x] Created API key management endpoints
- [x] Updated chat routes to call FastAPI
- [x] Added error handling for missing API key
- [x] Added error handling for FastAPI unavailable

### Frontend - TO DO 🚧
- [ ] Create settings page for API key management
- [ ] Update chat interface to display fraud results
- [ ] Add visual indicators for fraud/safe status
- [ ] Show confidence and risk level
- [ ] Handle errors (no API key, FastAPI down)
- [ ] Add loading states during detection

### Environment - TO DO 🚧
- [ ] Add API_KEY_ENCRYPTION_SECRET to .env
- [ ] Add FASTAPI_URL to .env
- [ ] Ensure FastAPI server is running on port 8000

---

## 🚀 Next Steps

1. **Add environment variables** to `.env.local`
2. **Start FastAPI server**: `cd Models && python fastapi_server.py`
3. **Start Next.js**: `npm run dev`
4. **Create settings page** for API key management
5. **Update chat UI** to display fraud detection results
6. **Test end-to-end** flow

---

## 📚 Documentation

- FastAPI endpoints: See `Models/FASTAPI_DOCUMENTATION.md`
- System architecture: See `Models/ARCHITECTURE_COMPLETE.md`
- Quick reference: See `Models/QUICK_REFERENCE.md`

---

**API Routes Integration Complete! Ready for frontend development! 🎉**
