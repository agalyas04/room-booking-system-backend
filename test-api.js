// Simple API Test Script
// Run with: node test-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let roomId = '';
let bookingId = '';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'user',
  department: 'IT',
  phoneNumber: '+1234567890'
};

const testRoom = {
  name: 'Conference Room A',
  capacity: 10,
  location: 'Floor 1',
  amenities: ['Projector', 'Whiteboard', 'WiFi'],
  description: 'Main conference room for meetings'
};

// Helper function to make requests
async function makeRequest(method, url, data = null, useAuth = false) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {}
    };

    if (useAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  const result = await makeRequest('GET', '/api/health');
  
  if (result.success) {
    console.log('✅ Health Check: PASSED');
    console.log('   Response:', result.data.message);
  } else {
    console.log('❌ Health Check: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testRegister() {
  console.log('\n👤 Testing User Registration...');
  const result = await makeRequest('POST', '/api/auth/register', testUser);
  
  if (result.success) {
    console.log('✅ Registration: PASSED');
    authToken = result.data.data.token;
    console.log('   User ID:', result.data.data.user._id);
    console.log('   Token received and stored');
  } else {
    console.log('❌ Registration: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testLogin() {
  console.log('\n🔐 Testing User Login...');
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const result = await makeRequest('POST', '/api/auth/login', loginData);
  
  if (result.success) {
    console.log('✅ Login: PASSED');
    authToken = result.data.data.token;
    console.log('   Token updated');
  } else {
    console.log('❌ Login: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testGetMe() {
  console.log('\n👥 Testing Get Current User...');
  const result = await makeRequest('GET', '/api/auth/me', null, true);
  
  if (result.success) {
    console.log('✅ Get Me: PASSED');
    console.log('   User:', result.data.data.name);
  } else {
    console.log('❌ Get Me: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testCreateRoom() {
  console.log('\n🏢 Testing Room Creation...');
  const result = await makeRequest('POST', '/api/rooms', testRoom, true);
  
  if (result.success) {
    console.log('✅ Room Creation: PASSED');
    roomId = result.data.data._id;
    console.log('   Room ID:', roomId);
  } else {
    console.log('❌ Room Creation: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testGetRooms() {
  console.log('\n📋 Testing Get All Rooms...');
  const result = await makeRequest('GET', '/api/rooms', null, true);
  
  if (result.success) {
    console.log('✅ Get Rooms: PASSED');
    console.log('   Total rooms:', result.data.count || result.data.data?.length || 'N/A');
  } else {
    console.log('❌ Get Rooms: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testCreateBooking() {
  console.log('\n📅 Testing Booking Creation...');
  
  if (!roomId) {
    console.log('❌ Booking Creation: SKIPPED (No room ID available)');
    return false;
  }

  const bookingData = {
    room: roomId,
    title: 'Test Meeting',
    description: 'API test booking',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    attendees: [testUser.email]
  };
  
  const result = await makeRequest('POST', '/api/bookings', bookingData, true);
  
  if (result.success) {
    console.log('✅ Booking Creation: PASSED');
    bookingId = result.data.data._id;
    console.log('   Booking ID:', bookingId);
  } else {
    console.log('❌ Booking Creation: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

async function testGetBookings() {
  console.log('\n📊 Testing Get All Bookings...');
  const result = await makeRequest('GET', '/api/bookings', null, true);
  
  if (result.success) {
    console.log('✅ Get Bookings: PASSED');
    console.log('   Total bookings:', result.data.count || result.data.data?.length || 'N/A');
  } else {
    console.log('❌ Get Bookings: FAILED');
    console.log('   Error:', result.error);
  }
  return result.success;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting API Tests for Room Booking System');
  console.log('=' .repeat(50));

  const tests = [
    testHealthCheck,
    testRegister,
    testLogin,
    testGetMe,
    testCreateRoom,
    testGetRooms,
    testCreateBooking,
    testGetBookings
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, makeRequest };
