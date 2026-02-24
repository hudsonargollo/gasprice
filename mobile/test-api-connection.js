#!/usr/bin/env node

// Simple test to verify API connection from mobile app perspective

const API_BASE_URL = 'https://pricepro.clubemkt.digital/api';

async function testApiConnection() {
  console.log('🧪 Testing FuelPrice Pro Mobile API Connection...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('https://pricepro.clubemkt.digital/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);
    
    // Test 2: API root
    console.log('\n2. Testing API root...');
    const apiResponse = await fetch('https://pricepro.clubemkt.digital/');
    const apiData = await apiResponse.json();
    console.log('✅ API Info:', apiData.service);
    
    // Test 3: Auth status (should fail without token - that's expected)
    console.log('\n3. Testing auth endpoint...');
    try {
      const authResponse = await fetch(`${API_BASE_URL}/auth/status`);
      if (authResponse.status === 401) {
        console.log('✅ Auth endpoint working (401 Unauthorized - expected without token)');
      } else {
        const authData = await authResponse.json();
        console.log('✅ Auth response:', authData);
      }
    } catch (error) {
      console.log('⚠️  Auth endpoint error:', error.message);
    }
    
    console.log('\n🎉 Mobile app can successfully connect to your API!');
    console.log('\nNext steps:');
    console.log('1. cd mobile');
    console.log('2. npm install');
    console.log('3. npm start');
    console.log('4. Scan QR code with Expo Go app');
    
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
  }
}

testApiConnection();