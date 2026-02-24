#!/usr/bin/env node

// Create a test user for the mobile app

const API_BASE_URL = 'https://pricepro.clubemkt.digital/api';

async function createTestUser() {
  console.log('🔐 Creating test user for FuelPrice Pro...\n');
  
  const testUser = {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  };
  
  try {
    console.log('Attempting to register user:', testUser.username);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ User created successfully!');
      console.log('📱 Use these credentials in the mobile app:');
      console.log(`   Username: ${testUser.username}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Role: ${testUser.role}`);
    } else {
      console.log('⚠️  Registration response:', data);
      
      if (data.error && data.error.includes('already exists')) {
        console.log('✅ User already exists! Use these credentials:');
        console.log(`   Username: ${testUser.username}`);
        console.log(`   Password: ${testUser.password}`);
        
        // Try to login to verify
        console.log('\n🔑 Testing login...');
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: testUser.username,
            password: testUser.password
          })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
          console.log('✅ Login successful! Credentials are working.');
        } else {
          console.log('❌ Login failed:', loginData);
          console.log('\n🆕 Try creating a new user with different credentials:');
          console.log('   Username: testuser');
          console.log('   Password: test123');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  }
}

createTestUser();