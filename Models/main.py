"""
FastAPI Server for LangGraph Fraud Detection
Receives queries with Google API key and user info from REST API
Returns fraud detection results
"""

from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
import json
import asyncio
from datetime import datetime
import os
import base64

from langgraph_fraud_detector import FraudDetectionGraph
from fraud_advisor import FraudAdvisorGraph

# Import QR detector
try:
    import sys
    qr_module_path = os.path.join(os.path.dirname(__file__), "QR-Spam")
    if qr_module_path not in sys.path:
        sys.path.insert(0, qr_module_path)
    from qr_detector import QRFraudDetector
    QR_DETECTOR_AVAILABLE = True
    print("✓ QR Fraud Detector imported successfully")
except Exception as e:
    QR_DETECTOR_AVAILABLE = False
    print(f"⚠️ QR Fraud Detector not available: {e}")

# ============================================
# PYDANTIC MODELS FOR REQUEST/RESPONSE
# ============================================

class UserInfo(BaseModel):
    """User information for RAG context"""
    username: str = Field(..., description="Username of the person making the query")
    email: str = Field(..., description="Email of the user")
    user_id: Optional[str] = Field(None, description="Optional user ID")
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v


class FraudDetectionRequest(BaseModel):
    """Request model for fraud detection"""
    query: Optional[str] = Field(
        "", 
        description="User's fraud detection query (optional if image is provided)"
    )
    google_api_key: str = Field(..., description="Google Gemini API key from user")
    user_info: UserInfo = Field(..., description="Information about the user making the request")
    models_path: Optional[str] = Field(
        None, 
        description="Path to ML models (optional, uses default if not provided)"
    )
    stream: Optional[bool] = Field(
        False, 
        description="Whether to stream the response"
    )
    session_id: Optional[str] = Field(
        None, 
        description="Session ID for conversation tracking (future use)"
    )
    image: Optional[str] = Field(
        None,
        description="Base64 encoded image for QR code fraud detection (full data URI)"
    )
    
    @validator('query', always=True)
    def validate_query_or_image(cls, v, values):
        """Ensure either query or image is provided"""
        image = values.get('image')
        if not v and not image:
            raise ValueError('Either query or image must be provided')
        return v or ""


class FraudDetectionResponse(BaseModel):
    """Response model for fraud detection"""
    success: bool = Field(..., description="Whether the request was successful")
    timestamp: str = Field(..., description="Timestamp of the response")
    user_info: UserInfo = Field(..., description="User who made the request")
    query: str = Field(..., description="Original query")
    result: Dict[str, Any] = Field(..., description="Fraud detection result")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")
    session_id: Optional[str] = Field(None, description="Session ID if provided")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    message: str


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    timestamp: str
    query: Optional[str] = None


class AdvisorRequest(BaseModel):
    """Request model for fraud advisor"""
    query: str = Field(..., description="User's fraud prevention question", min_length=1)
    google_api_key: str = Field(..., description="Google Gemini API key from user")
    user_info: UserInfo = Field(..., description="Information about the user making the request")
    session_id: Optional[str] = Field(None, description="Session ID for conversation tracking")


class AdvisorResponse(BaseModel):
    """Response model for fraud advisor"""
    success: bool = Field(..., description="Whether the request was successful")
    timestamp: str = Field(..., description="Timestamp of the response")
    user_info: UserInfo = Field(..., description="User who made the request")
    query: str = Field(..., description="Original query")
    result: Dict[str, Any] = Field(..., description="Advisor result")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")
    session_id: Optional[str] = Field(None, description="Session ID if provided")


# ============================================
# FASTAPI APP INITIALIZATION
# ============================================

app = FastAPI(
    title="Fraud Detection API",
    description="LangGraph-powered fraud detection system with ML models and LLM reasoning",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - configured for Next.js communication (local + production)
# CORS middleware - configured for Next.js communication (local + production)
# Production: set FRONTEND_URL to your frontend origin (e.g. https://app.example.com)
# Optionally set FRONTEND_ORIGIN_REGEX to allow wildcard origins (e.g. r"https://.*\.vercel\.app")
frontend_origin = "https://sotrian.vercel.app"
frontend_origin_regex = "https://sotrian.vercel.app"

default_dev_origins = [
    "http://localhost:3000",      # Local Next.js development
    "http://127.0.0.1:3000",      # Alternative localhost
    "http://localhost:3001",      # Alternative port
]

allow_origins = []
if frontend_origin:
    # Use the explicitly provided production origin first
    allow_origins.append(frontend_origin)

# Always include dev origins so local testing still works
allow_origins.extend(default_dev_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    # Use allow_origin_regex when provided (useful for wildcard Vercel previews)
    allow_origin_regex=frontend_origin_regex if frontend_origin_regex else None,
    allow_credentials=True,
    allow_methods=["*"],              # Allow all HTTP methods
    allow_headers=["*"],              # Allow all headers
    expose_headers=["*"],
    max_age=3600,                     # Cache preflight requests for 1 hour
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_default_models_path() -> str:
    """Get default models path"""
    return os.getenv('MODELS_PATH', r'X:\Web Development\Nextjs_Projects\New folder\Models')


def create_detector(api_key: str, models_path: str) -> FraudDetectionGraph:
    """Create a new fraud detector instance"""
    try:
        detector = FraudDetectionGraph(
            google_api_key=api_key,
            models_base_path=models_path
        )
        return detector
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize fraud detector: {str(e)}"
        )


def create_advisor(api_key: str) -> FraudAdvisorGraph:
    """Create a new fraud advisor instance"""
    try:
        advisor = FraudAdvisorGraph(google_api_key=api_key)
        return advisor
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize fraud advisor: {str(e)}"
        )


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    return HealthResponse(
        status="online",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        message="Fraud Detection API is running. Visit /docs for API documentation."
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        message="All systems operational"
    )


@app.post("/api/detect", response_model=FraudDetectionResponse)
async def detect_fraud(request: FraudDetectionRequest):
    """
    Main fraud detection endpoint
    
    Receives:
    - User query
    - Google API key (from user's settings)
    - User information (username, email)
    - Optional models path
    - Optional image (base64) for QR code detection
    
    Returns:
    - Fraud detection result with full context
    """
    start_time = datetime.now()
    
    try:
        # 🔍 CRITICAL DEBUG - Check what we received
        print("\n" + "="*80)
        print("📥 RECEIVED REQUEST AT /api/detect")
        print(f"  📝 Query: {request.query[:50]}..." if request.query else "  📝 Query: None")
        print(f"  🖼️  Image Present: {bool(request.image)}")
        print(f"  📏 Image Size: {len(request.image) if request.image else 0} bytes")
        if request.image:
            print(f"  🔍 Image starts with: {request.image[:100]}...")
            print(f"  📊 Image format: {'Data URI' if request.image.startswith('data:') else 'Raw Base64'}")
        print(f"  🤖 QR Detector Available: {QR_DETECTOR_AVAILABLE}")
        print(f"  👤 User: {request.user_info.username}")
        print("="*80 + "\n")
        
        # Validate API key format
        if not request.google_api_key or len(request.google_api_key) < 20:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google API key format"
            )
        
        # 🔥 PRIORITY: Check if this is a QR code detection request FIRST (before text processing)
        # If image is present, always treat as QR fraud detection, not URL detection
        if request.image and QR_DETECTOR_AVAILABLE:
            print(f"🎯 ENTERING QR DETECTION BRANCH - Image size: {len(request.image)} bytes")
            try:
                # Initialize QR detector
                models_path = request.models_path or get_default_models_path()
                qr_detector = QRFraudDetector(
                    model_path=os.path.join(models_path, "QR-Spam", "qr_fraud_detection", "file_zip", "qr_fraud_model.pkl")
                )
                
                # Detect fraud in QR code
                print("📸 Running QR fraud detection on image...")
                result = qr_detector.detect_fraud_from_base64(request.image)
                print(f"✅ QR Detection complete - Is Fraud: {result['is_fraud']}, Confidence: {result['confidence']*100:.1f}%")
                
                # Enhance the response with LLM for better English explanation
                detector = create_detector(request.google_api_key, models_path)
                llm_prompt = f"""You are a fraud detection expert explaining QR code fraud to a user in a natural, conversational way.

The QR code was analyzed and found to be {'FRAUDULENT' if result['is_fraud'] else 'LEGITIMATE'}.

Technical Analysis:
- Confidence: {result['confidence']*100:.1f}%
- Risk Level: {result['risk_level']}
- Decoded Data: {result['details'].get('decoded_data', 'N/A')[:100]}
- Contains URL: {'Yes' if result['details'].get('contains_url') else 'No'}

Write a clear, natural explanation (2-3 paragraphs) for the user about what this QR code is and why it's {'dangerous' if result['is_fraud'] else 'safe'}. Include specific recommendations.

Be conversational and helpful, not technical. Explain it like you're talking to a friend."""

                llm_response = detector.llm.invoke(llm_prompt)
                result['formatted_message'] = llm_response.content
                print("✅ LLM formatting complete")
                
            except Exception as e:
                print(f"❌ QR detection error: {e}")
                result = {
                    'fraud_type': 'qr_fraud',
                    'is_fraud': False,
                    'confidence': 0.0,
                    'risk_level': 'N/A',
                    'detection_method': 'ERROR',
                    'reasoning': f'Error processing QR code image: {str(e)}',
                    'recommendation': 'Unable to analyze the QR code. Please ensure the image is clear and contains a valid QR code.',
                    'details': {'error': str(e)}
                }
                result['formatted_message'] = result['reasoning'] + "\n\n" + result['recommendation']
            
            # Ensure all boolean values are proper Python bools for JSON serialization
            if 'is_fraud' in result:
                result['is_fraud'] = bool(result['is_fraud'])
            if 'details' in result and isinstance(result['details'], dict):
                if 'contains_url' in result['details']:
                    result['details']['contains_url'] = bool(result['details']['contains_url'])
        else:
            # Normal text-based fraud detection
            # Get models path
            models_path = request.models_path or get_default_models_path()
            
            # Create detector instance with user's API key
            detector = create_detector(request.google_api_key, models_path)
            
            # Run fraud detection (protect against detector errors for malformed input)
            try:
                result = detector.detect_fraud(request.query)
            except Exception as e:
                # Return a safe fallback result instead of raising so the caller can handle it gracefully
                err_msg = str(e)
                result = {
                    'fraud_type': 'invalid_query',
                    'is_fraud': False,
                    'confidence': 0.0,
                    'risk_level': 'N/A',
                    'detection_method': 'QUERY_VALIDATOR',
                    'reasoning': 'Unable to process query. Input may be unclear or malformed.',
                    'recommendation': "I didn't understand that. Could you rephrase or provide more details?",
                    'details': {'error': err_msg}
                }
                # Log the error for debugging
                print(f"Detector error for query '{request.query}': {err_msg}")
        
        # Calculate processing time
        end_time = datetime.now()
        processing_time_ms = (end_time - start_time).total_seconds() * 1000
        
        # Build response
        response = FraudDetectionResponse(
            success=True,
            timestamp=end_time.isoformat(),
            user_info=request.user_info,
            query=request.query,
            result=result,
            processing_time_ms=round(processing_time_ms, 2),
            session_id=request.session_id
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Fraud detection failed: {str(e)}"
        )


@app.post("/api/detect/stream")
async def detect_fraud_stream(request: FraudDetectionRequest):
    """
    Streaming fraud detection endpoint
    
    Streams the fraud detection message in real-time for smooth UX
    Returns Server-Sent Events (SSE) for live updates
    """
    
    async def generate_stream():
        """Generate streaming response"""
        try:
            # 🔍 CRITICAL DEBUG - Check what we received
            print("\n" + "="*80)
            print("📥 RECEIVED REQUEST AT /api/detect/stream")
            print(f"  📝 Query: {request.query[:50]}..." if request.query else "  📝 Query: None")
            print(f"  🖼️  Image Present: {bool(request.image)}")
            print(f"  📏 Image Size: {len(request.image) if request.image else 0} bytes")
            if request.image:
                print(f"  🔍 Image starts with: {request.image[:100]}...")
                print(f"  📊 Image format: {'Data URI' if request.image.startswith('data:') else 'Raw Base64'}")
            print(f"  🤖 QR Detector Available: {QR_DETECTOR_AVAILABLE}")
            print(f"  👤 User: {request.user_info.username}")
            print("="*80 + "\n")
            
            # Validate API key
            if not request.google_api_key or len(request.google_api_key) < 20:
                error_data = {
                    "error": "Invalid Google API key format",
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                return
            
            # Get models path
            models_path = request.models_path or get_default_models_path()
            
            # Send initial status
            start_event = {
                "type": "start",
                "timestamp": datetime.now().isoformat(),
                "query": request.query,
                "user": request.user_info.username
            }
            yield f"data: {json.dumps(start_event)}\n\n"
            
            # 🔥 PRIORITY: QR code detection FIRST - if image exists, skip text-based fraud detection
            if request.image and QR_DETECTOR_AVAILABLE:
                print("🎯 ENTERING QR DETECTION BRANCH")
                print(f"🔍 QR DETECTION MODE (STREAMING) - Image size: {len(request.image)} bytes")
                try:
                    # Initialize QR detector
                    qr_detector = QRFraudDetector(
                        model_path=os.path.join(models_path, "QR-Spam", "qr_fraud_detection", "file_zip", "qr_fraud_model.pkl")
                    )
                    
                    # Detect fraud in QR code
                    print("📸 Running QR fraud detection on image...")
                    result = qr_detector.detect_fraud_from_base64(request.image)
                    print(f"✅ QR Detection complete - Is Fraud: {result['is_fraud']}, Confidence: {result['confidence']*100:.1f}%")
                    
                    # Enhance with LLM for natural explanation
                    detector = create_detector(request.google_api_key, models_path)
                    llm_prompt = f"""You are a fraud detection expert explaining QR code fraud to a user in a natural, conversational way.

The QR code was analyzed and found to be {'FRAUDULENT' if result['is_fraud'] else 'LEGITIMATE'}.

Technical Analysis:
- Confidence: {result['confidence']*100:.1f}%
- Risk Level: {result['risk_level']}
- Decoded Data: {result['details'].get('decoded_data', 'N/A')[:100]}
- Contains URL: {'Yes' if result['details'].get('contains_url') else 'No'}

Write a clear, natural explanation (2-3 paragraphs) for the user about what this QR code is and why it's {'dangerous' if result['is_fraud'] else 'safe'}. Include specific recommendations.

Be conversational and helpful, not technical. Explain it like you're talking to a friend."""

                    llm_response = detector.llm.invoke(llm_prompt)
                    formatted_message = llm_response.content
                    print("✅ LLM formatting complete")
                    
                    # Stream the message word by word
                    words = formatted_message.split(' ')
                    chunk_size = 3
                    accumulated = ''
                    
                    for i in range(0, len(words), chunk_size):
                        chunk_text = ' '.join(words[i:i+chunk_size])
                        if i + chunk_size < len(words):
                            chunk_text += ' '
                        
                        accumulated += chunk_text
                        
                        chunk_data = {
                            "type": "content",
                            "content": chunk_text,
                            "is_complete": False,
                            "timestamp": datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                        await asyncio.sleep(0.05)
                    
                    # Update result with formatted message
                    result['formatted_message'] = formatted_message
                    
                    # Convert all non-serializable types to JSON-compatible types
                    def make_json_serializable(obj):
                        """Recursively convert non-serializable objects"""
                        if isinstance(obj, dict):
                            return {k: make_json_serializable(v) for k, v in obj.items()}
                        elif isinstance(obj, (list, tuple)):
                            return [make_json_serializable(item) for item in obj]
                        elif isinstance(obj, bool):
                            return bool(obj)  # Explicitly convert to Python bool
                        elif isinstance(obj, (int, float)):
                            return float(obj) if isinstance(obj, float) else int(obj)
                        elif isinstance(obj, str):
                            return str(obj)
                        elif obj is None:
                            return None
                        else:
                            return str(obj)  # Convert everything else to string
                    
                    # Make result JSON-serializable
                    safe_result = make_json_serializable(result)
                    
                    # Send completion
                    complete_data = {
                        "type": "complete",
                        "content": "",
                        "is_complete": True,
                        "result": safe_result,
                        "user_info": request.user_info.dict(),
                        "session_id": request.session_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(complete_data)}\n\n"
                    print("✅ QR streaming complete")
                    
                except Exception as e:
                    print(f"❌ QR detection streaming error: {e}")
                    error_result = {
                        'fraud_type': 'qr_fraud',
                        'is_fraud': False,
                        'confidence': 0.0,
                        'risk_level': 'N/A',
                        'detection_method': 'ERROR',
                        'reasoning': f'Error processing QR code: {str(e)}',
                        'recommendation': 'Unable to analyze the QR code. Please ensure the image is clear.',
                        'details': {'error': str(e)}
                    }
                    error_message = error_result['reasoning'] + "\n\n" + error_result['recommendation']
                    
                    # Stream error message
                    chunk_data = {
                        "type": "content",
                        "content": error_message,
                        "is_complete": False,
                        "timestamp": datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    
                    complete_data = {
                        "type": "complete",
                        "content": "",
                        "is_complete": True,
                        "result": error_result,
                        "user_info": request.user_info.dict(),
                        "session_id": request.session_id,
                        "timestamp": datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(complete_data)}\n\n"
            else:
                # Normal text-based fraud detection with streaming
                # Create detector
                detector = create_detector(request.google_api_key, models_path)
                
                # Stream the detection message
                async for chunk in detector.detect_fraud_stream(request.query):
                    chunk_data = {
                        "type": chunk.get("type", "content"),
                        "content": chunk.get("content", ""),
                        "is_complete": chunk.get("is_complete", False),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # If complete, include full result
                    if chunk.get("is_complete"):
                        chunk_data["result"] = chunk.get("result", {})
                        chunk_data["user_info"] = request.user_info.dict()
                        chunk_data["session_id"] = request.session_id
                    
                    yield f"data: {json.dumps(chunk_data)}\n\n"
            
        except Exception as e:
            error_event = {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/validate-query")
async def validate_query(request: FraudDetectionRequest):
    """
    Validate if a query is fraud-related without full detection
    Quick check before processing
    """
    try:
        # Validate API key
        if not request.google_api_key or len(request.google_api_key) < 20:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google API key format"
            )
        
        models_path = request.models_path or get_default_models_path()
        detector = create_detector(request.google_api_key, models_path)
        
        # Run only validation node
        from langgraph_fraud_detector import FraudDetectionState
        initial_state: FraudDetectionState = {
            'user_input': request.query,
            'fraud_type': '',
            'parsed_data': {},
            'ml_prediction': {},
            'llm_analysis': {},
            'final_result': {},
            'messages': []
        }
        
        validated_state = detector.validate_input(initial_state)
        
        # Check if it's a valid fraud query
        is_valid = validated_state['fraud_type'] not in ['greeting', 'capability_query', 'invalid_query']
        
        return {
            "success": True,
            "is_valid_fraud_query": is_valid,
            "query_type": validated_state.get('fraud_type', 'unknown'),
            "message": validated_state.get('final_result', {}).get('recommendation', 'Valid query'),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query validation failed: {str(e)}"
        )


@app.get("/api/supported-fraud-types")
async def get_supported_fraud_types():
    """Get list of supported fraud detection types"""
    return {
        "success": True,
        "fraud_types": [
            {
                "type": "credit_card",
                "name": "Credit Card Fraud",
                "description": "Detect fraudulent credit card transactions",
                "method": "ML Model + LLM",
                "example": "Transaction with Amount: 500, Time: 5000"
            },
            {
                "type": "email_spam",
                "name": "Email/SMS Spam",
                "description": "Detect spam and phishing in emails/SMS",
                "method": "ML Model + LLM",
                "example": "CONGRATULATIONS! You won a prize!"
            },
            {
                "type": "url_fraud",
                "name": "URL/Phishing Detection",
                "description": "Detect malicious URLs and phishing attempts",
                "method": "ML Model + LLM",
                "example": "http://secure-paypal-login.suspicious.com"
            },
            {
                "type": "upi_fraud",
                "name": "UPI Transaction Fraud",
                "description": "Detect fraudulent UPI payments",
                "method": "LLM Reasoning",
                "example": "UPI payment of 50000 rupees at midnight"
            }
        ],
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/batch-detect")
async def batch_detect(
    queries: list[str],
    google_api_key: str = Header(..., alias="X-Google-API-Key"),
    username: str = Header(..., alias="X-Username"),
    email: str = Header(..., alias="X-User-Email")
):
    """
    Batch fraud detection endpoint
    Process multiple queries at once
    """
    try:
        if not queries or len(queries) == 0:
            raise HTTPException(
                status_code=400,
                detail="No queries provided"
            )
        
        if len(queries) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 queries allowed per batch"
            )
        
        models_path = get_default_models_path()
        detector = create_detector(google_api_key, models_path)
        
        results = []
        for query in queries:
            try:
                result = detector.detect_fraud(query)
                results.append({
                    "query": query,
                    "success": True,
                    "result": result
                })
            except Exception as e:
                results.append({
                    "query": query,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "total_queries": len(queries),
            "results": results,
            "user": {"username": username, "email": email},
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch detection failed: {str(e)}"
        )


# ============================================
# FRAUD ADVISOR ENDPOINTS
# ============================================

@app.post("/api/advisor/chat", response_model=AdvisorResponse)
async def advisor_chat(request: AdvisorRequest):
    """
    Fraud Prevention Advisor endpoint
    
    Provides fraud prevention advice and best practices
    """
    start_time = datetime.now()
    
    try:
        # Validate API key format
        if not request.google_api_key or len(request.google_api_key) < 20:
            raise HTTPException(
                status_code=400,
                detail="Invalid Google API key format"
            )
        
        # Create advisor instance with user's API key
        advisor = create_advisor(request.google_api_key)
        
        # Get advice
        try:
            result = advisor.get_advice(request.query)
        except Exception as e:
            # Fallback result
            err_msg = str(e)
            result = {
                'query_category': 'general',
                'greeting': 'Hello! I apologize for the confusion.',
                'analysis': 'I encountered an issue processing your question. Let me try to help anyway.',
                'recommendations': [
                    'Always verify the source before sharing information',
                    'Use strong, unique passwords',
                    'Enable two-factor authentication',
                    'Monitor your accounts regularly',
                    'Keep your software updated'
                ],
                'conclusion': 'Stay safe and informed!',
                'formatted_response': 'I apologize, but I encountered an issue. Please try rephrasing your question.'
            }
            print(f"Advisor error for query '{request.query}': {err_msg}")
        
        # Calculate processing time
        end_time = datetime.now()
        processing_time_ms = (end_time - start_time).total_seconds() * 1000
        
        # Build response
        response = AdvisorResponse(
            success=True,
            timestamp=end_time.isoformat(),
            user_info=request.user_info,
            query=request.query,
            result=result,
            processing_time_ms=round(processing_time_ms, 2),
            session_id=request.session_id
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Advisor failed: {str(e)}"
        )


@app.post("/api/advisor/stream")
async def advisor_stream(request: AdvisorRequest):
    """
    Streaming fraud advisor endpoint
    
    Streams the advisor response in real-time for smooth UX
    Returns Server-Sent Events (SSE) for live updates
    """
    
    async def generate_stream():
        """Generate streaming response"""
        try:
            # Validate API key
            if not request.google_api_key or len(request.google_api_key) < 20:
                error_data = {
                    "error": "Invalid Google API key format",
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                return
            
            # Create advisor
            advisor = create_advisor(request.google_api_key)
            
            # Send initial status
            start_event = {
                "type": "start",
                "timestamp": datetime.now().isoformat(),
                "query": request.query,
                "user": request.user_info.username,
                "mode": "advisor"
            }
            yield f"data: {json.dumps(start_event)}\n\n"
            
            # Stream the advisor response
            async for chunk in advisor.get_advice_stream(request.query):
                chunk_data = {
                    "type": chunk.get("type", "content"),
                    "content": chunk.get("content", ""),
                    "is_complete": chunk.get("is_complete", False),
                    "timestamp": datetime.now().isoformat(),
                    "mode": "advisor"
                }
                
                # If complete, include full result
                if chunk.get("is_complete"):
                    chunk_data["result"] = chunk.get("result", {})
                    chunk_data["user_info"] = request.user_info.dict()
                    chunk_data["session_id"] = request.session_id
                
                yield f"data: {json.dumps(chunk_data)}\n\n"
            
        except Exception as e:
            error_event = {
                "type": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "mode": "advisor"
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ============================================
# ERROR HANDLERS
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return {
        "success": False,
        "error": exc.detail,
        "status_code": exc.status_code,
        "timestamp": datetime.now().isoformat()
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    return {
        "success": False,
        "error": f"Internal server error: {str(exc)}",
        "status_code": 500,
        "timestamp": datetime.now().isoformat()
    }


# ============================================
# STARTUP/SHUTDOWN EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    """Run on server startup"""
    print("="*60)
    print("🚀 FRAUD DETECTION FASTAPI SERVER STARTING")
    print("="*60)
    print(f"📅 Timestamp: {datetime.now().isoformat()}")
    print(f"📁 Default Models Path: {get_default_models_path()}")
    print(f"🌐 Docs available at: http://localhost:8000/docs")
    print(f"📖 ReDoc available at: http://localhost:8000/redoc")
    print("="*60)


@app.on_event("shutdown")
async def shutdown_event():
    """Run on server shutdown"""
    print("\n👋 Fraud Detection API shutting down...")


# ============================================
# MAIN EXECUTION
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "fastapi_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )



# uvicorn main:app --reload --host 0.0.0.0 --port 8000
