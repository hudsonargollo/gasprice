#!/bin/bash

# Create a simple landing page for the FuelPrice Pro API

DOMAIN="pricepro.clubemkt.digital"
WEB_ROOT="/var/www/fuelprice-pro"

echo "=== CREATING LANDING PAGE ==="

# Create web directory
mkdir -p $WEB_ROOT

# Create simple HTML landing page
cat > $WEB_ROOT/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FuelPrice Pro API</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .status { 
            padding: 10px; 
            margin: 20px 0; 
            border-radius: 4px; 
            background: #d4edda; 
            border: 1px solid #c3e6cb; 
            color: #155724;
        }
        .endpoint {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #007bff;
            font-family: monospace;
        }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚗 FuelPrice Pro API</h1>
        <div class="status">
            <strong>Status:</strong> API is running and operational
        </div>
        
        <h2>Available Endpoints</h2>
        
        <div class="endpoint">
            <strong>Health Check:</strong><br>
            <a href="/health" target="_blank">GET /health</a>
        </div>
        
        <div class="endpoint">
            <strong>Authentication:</strong><br>
            POST /api/auth/login<br>
            POST /api/auth/register<br>
            GET /api/auth/status
        </div>
        
        <div class="endpoint">
            <strong>Stations Management:</strong><br>
            GET /api/stations<br>
            POST /api/stations<br>
            PUT /api/stations/:id
        </div>
        
        <div class="endpoint">
            <strong>Price Updates:</strong><br>
            POST /api/prices/update<br>
            GET /api/prices/history
        </div>
        
        <h2>Documentation</h2>
        <p>This is a REST API for managing fuel stations and price updates. All endpoints except <code>/health</code> require JWT authentication.</p>
        
        <p><strong>Authentication:</strong> Include <code>Authorization: Bearer &lt;token&gt;</code> header in your requests.</p>
        
        <h2>Quick Test</h2>
        <p>Test the API health: <a href="/health" target="_blank">Check Health Status</a></p>
        
        <script>
            // Auto-refresh health status
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    console.log('API Health:', data);
                })
                .catch(error => {
                    console.error('API Error:', error);
                });
        </script>
    </div>
</body>
</html>
EOF

# Set proper permissions
chown -R www-data:www-data $WEB_ROOT
chmod -R 755 $WEB_ROOT

echo "Landing page created at $WEB_ROOT/index.html"
echo "Testing web access..."
curl -I http://localhost/

echo ""
echo "SUCCESS: Landing page is now available at https://$DOMAIN/"