#!/usr/bin/env node

/**
 * Test script to verify Next.js → FastAPI connection
 * Run with: node test-connection.js
 */

const fetch = require('node-fetch');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testFastAPIHealth() {
  log('\n1️⃣  Testing FastAPI Health Check...', 'blue');
  
  try {
    const response = await fetch('http://localhost:8000/health');
    const data = await response.json();
    
    if (response.ok && data.status === 'healthy') {
      log('✅ FastAPI server is running and healthy!', 'green');
      log(`   Version: ${data.version}`, 'reset');
      log(`   Message: ${data.message}`, 'reset');
      return true;
    } else {
      log('❌ FastAPI server responded but not healthy', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Cannot connect to FastAPI server', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('   Make sure FastAPI is running: python fastapi_server.py', 'yellow');
    return false;
  }
}

async function testFraudDetection() {
  log('\n2️⃣  Testing Fraud Detection Endpoint...', 'blue');
  
  // Check if user has API key in environment
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    log('⚠️  GOOGLE_API_KEY not found in environment', 'yellow');
    log('   Skipping fraud detection test', 'yellow');
    log('   To test: export GOOGLE_API_KEY=your_key', 'yellow');
    return false;
  }
  
  try {
    const response = await fetch('http://localhost:8000/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Check this email: CONGRATULATIONS! You won a FREE prize!',
        google_api_key: apiKey,
        user_info: {
          username: 'test_user',
          email: 'test@example.com',
          user_id: 'test_123'
        },
        session_id: 'test_session'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Fraud detection working!', 'green');
      log(`   Fraud Type: ${data.result.fraud_type}`, 'reset');
      log(`   Is Fraud: ${data.result.is_fraud ? '🚨 YES' : '✅ NO'}`, 'reset');
      log(`   Confidence: ${(data.result.confidence * 100).toFixed(1)}%`, 'reset');
      log(`   Risk Level: ${data.result.risk_level}`, 'reset');
      log(`   Processing Time: ${data.processing_time_ms}ms`, 'reset');
      return true;
    } else {
      log('❌ Fraud detection failed', 'red');
      log(`   Error: ${data.error || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log('❌ Fraud detection request failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testEncryptionDecryption() {
  log('\n3️⃣  Testing API Key Encryption/Decryption...', 'blue');
  
  try {
    const crypto = require('crypto');
    const ENCRYPTION_KEY = 'test-32-character-secret-key!';
    const ALGORITHM = 'aes-256-cbc';
    
    // Test encryption
    const testApiKey = 'AIzaSyTestKey123456789';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      iv
    );
    let encrypted = cipher.update(testApiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedKey = iv.toString('hex') + ':' + encrypted;
    
    // Test decryption
    const parts = encryptedKey.split(':');
    const ivDecrypt = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      ivDecrypt
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    if (decrypted === testApiKey) {
      log('✅ Encryption/Decryption working correctly!', 'green');
      log(`   Original:  ${testApiKey}`, 'reset');
      log(`   Encrypted: ${encryptedKey.substring(0, 40)}...`, 'reset');
      log(`   Decrypted: ${decrypted}`, 'reset');
      return true;
    } else {
      log('❌ Encryption/Decryption mismatch', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Encryption/Decryption test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testCORS() {
  log('\n4️⃣  Testing CORS Configuration...', 'blue');
  
  try {
    const response = await fetch('http://localhost:8000/api/supported-fraud-types', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
    };
    
    log('✅ CORS headers present:', 'green');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        log(`   ${key}: ${value}`, 'reset');
      }
    });
    
    return true;
  } catch (error) {
    log('❌ CORS test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║      Next.js ↔ FastAPI Connection Test Suite              ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  const results = {
    health: await testFastAPIHealth(),
    fraudDetection: await testFraudDetection(),
    encryption: await testEncryptionDecryption(),
    cors: await testCORS()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║                      Test Results                          ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const status = result ? 'PASS' : 'FAIL';
    const color = result ? 'green' : 'red';
    log(`${icon} ${test.padEnd(20)} ${status}`, color);
  });
  
  log(`\n📊 Overall: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All tests passed! Connection is ready!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
  
  log('\n📚 For more info, see CONNECTION_SETUP.md', 'blue');
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
