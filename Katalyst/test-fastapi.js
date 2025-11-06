// Quick test to check if FastAPI is reachable
const testFastAPI = async () => {
  console.log('🔍 Testing FastAPI connection...\n');
  
  const FASTAPI_URL = 'http://127.0.0.1:8000';
  
  // Test 1: Health check
  try {
    console.log('Test 1: Health check at /health');
    const healthResponse = await fetch(`${FASTAPI_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }
  
  // Test 2: Root endpoint
  try {
    console.log('\nTest 2: Root endpoint at /');
    const rootResponse = await fetch(`${FASTAPI_URL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Root endpoint passed:', rootData);
  } catch (error) {
    console.error('❌ Root endpoint failed:', error.message);
    return;
  }
  
  // Test 3: Detect endpoint with dummy data
  try {
    console.log('\nTest 3: Fraud detection endpoint at /api/detect');
    const detectResponse = await fetch(`${FASTAPI_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hello, can you help me?',
        google_api_key: 'AIzaSyCQLXiuy8kKOaTlZRyADitrEBh9a5TKA_w',
        user_info: {
          username: 'test_user',
          email: 'test@example.com',
          user_id: 'test123'
        }
      })
    });
    
    console.log('Response status:', detectResponse.status);
    console.log('Response headers:', Object.fromEntries(detectResponse.headers));
    
    if (!detectResponse.ok) {
      const errorText = await detectResponse.text();
      console.error('❌ Detect endpoint failed:', errorText);
      return;
    }
    
    const detectData = await detectResponse.json();
    console.log('✅ Detect endpoint passed!');
    console.log('Result:', JSON.stringify(detectData, null, 2));
    
  } catch (error) {
    console.error('❌ Detect endpoint failed:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
};

testFastAPI();
