/**
 * Quick test script for API endpoints
 * Run: node test-api.js
 */

const API_BASE = 'http://localhost:3000';

async function testCreateSession() {
  console.log('\n📝 Testing: Create Session');
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
    });
    
    const data = await response.json();
    console.log('✓ Response:', data);
    return data.code;
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function testGetSession(code) {
  console.log(`\n📝 Testing: Get Session (${code})`);
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${code}`);
    const data = await response.json();
    console.log('✓ Response:', data);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function testInvalidSession() {
  console.log('\n📝 Testing: Invalid Session');
  try {
    const response = await fetch(`${API_BASE}/api/sessions/invalid`);
    const data = await response.json();
    console.log('✓ Response:', data);
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

async function runTests() {
  console.log('🐱 Meow Share API Tests\n');
  console.log('Make sure the server is running on port 3000!\n');
  
  const code = await testCreateSession();
  if (code) {
    await testGetSession(code);
  }
  await testInvalidSession();
  
  console.log('\n✓ Tests complete!\n');
}

runTests();
