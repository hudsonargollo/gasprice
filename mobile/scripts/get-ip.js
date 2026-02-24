#!/usr/bin/env node

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIPAddress();
console.log('\n🌐 Your local IP address is:', ip);
console.log('\n📱 Update mobile/src/services/apiClient.ts with:');
console.log(`   const API_BASE_URL = 'http://${ip}:3000/api'`);
console.log('\n💡 Make sure your backend server is running on port 3000');
console.log('   and both your computer and mobile device are on the same WiFi network.\n');