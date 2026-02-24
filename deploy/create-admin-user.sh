#!/bin/bash

# Create the first admin user for FuelPrice Pro

set -e

echo "=== CREATING ADMIN USER ==="

# Generate a secure password hash for 'admin123'
# Using Node.js to generate bcrypt hash
HASHED_PASSWORD=$(docker exec fuelprice-app node -e "
const bcrypt = require('bcrypt');
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

echo "Generated password hash for 'admin123'"

# Insert admin user into database
echo "Creating admin user in database..."
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c "
INSERT INTO users (id, username, password_hash, role, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'admin',
  '$HASHED_PASSWORD',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;
"

echo ""
echo "✅ Admin user created successfully!"
echo ""
echo "📱 Mobile App Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   Role: admin"
echo ""
echo "🔐 You can now login to the mobile app with these credentials."
echo ""

# Test the login
echo "Testing login credentials..."
curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | head -c 200

echo ""
echo ""
echo "If you see a token above, the credentials are working!"