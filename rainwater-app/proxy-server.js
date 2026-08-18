// Simple proxy server for India WRIS API
// Run with: node proxy-server.js
// Then use: http://localhost:3001/api/groundWaterLevel

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy middleware for India WRIS API
app.use('/proxy', createProxyMiddleware({
  target: 'https://indiawris.gov.in',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy': '', // Remove /proxy prefix
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy server error', details: err.message });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request to:', proxyReq.path);
    console.log('Request method:', proxyReq.method);
    console.log('Request headers:', proxyReq.getHeaders());
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('Proxy response status:', proxyRes.statusCode);
  }
}));

// Alternative endpoint for direct API access
app.use('/api', createProxyMiddleware({
  target: 'https://indiawris.gov.in',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/Dataset/Ground Water Level', // Rewrite to correct endpoint
  },
  onError: (err, req, res) => {
    console.error('API Proxy error:', err);
    res.status(500).json({ error: 'API Proxy server error', details: err.message });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('API Proxying request to:', proxyReq.path);
    console.log('API Request method:', proxyReq.method);
    console.log('API Request headers:', proxyReq.getHeaders());
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('API Proxy response status:', proxyRes.statusCode);
    console.log('API Proxy response headers:', proxyRes.headers);
    
    // Log response body for debugging
    let body = '';
    proxyRes.on('data', (chunk) => {
      body += chunk;
    });
    proxyRes.on('end', () => {
      console.log('API Response body:', body.substring(0, 500)); // Log first 500 chars
    });
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Proxy server is running' });
});

// Simple test endpoint to verify proxy is working
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Proxy server is working correctly',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

// Test endpoint to debug the API directly
app.post('/test-api', async (req, res) => {
  try {
    console.log('🧪 Testing India WRIS API directly...');
    
    // Try multiple possible endpoints with different date formats
    const testEndpoints = [
      'https://indiawris.gov.in/Dataset/Ground Water Level?stateName=tamil%20nadu&districtName=chennai&agencyName=cgwb&startdate=2020-09-13&enddate=2025-09-13&download=false&page=0&size=10',
      'https://indiawris.gov.in/Dataset/Ground Water Level?stateName=tamil%20nadu&districtName=chennai&agencyName=cgwb&startdate=2020-01-01&enddate=2025-12-31&download=false&page=0&size=10',
      'https://indiawris.gov.in/Dataset/Ground Water Level?stateName=tamil%20nadu&districtName=chennai&agencyName=cgwb&download=false&page=0&size=10',
      'https://indiawris.gov.in/wris/#/apiCatalog'
    ];
    
    const results = [];
    
    for (let i = 0; i < testEndpoints.length; i++) {
      const testUrl = testEndpoints[i];
      console.log(`🔗 Testing endpoint ${i + 1}: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: ''
        });
        
        console.log(`📊 Endpoint ${i + 1} response status:`, response.status);
        console.log(`📊 Endpoint ${i + 1} response headers:`, Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log(`📄 Endpoint ${i + 1} response body:`, responseText.substring(0, 500));
        
        results.push({
          endpoint: testUrl,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText,
          isJson: responseText.trim().startsWith('{') || responseText.trim().startsWith('['),
          isHtml: responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')
        });
        
      } catch (error) {
        console.error(`💥 Endpoint ${i + 1} error:`, error.message);
        results.push({
          endpoint: testUrl,
          error: error.message
        });
      }
    }
    
    // Always return JSON, never HTML
    res.setHeader('Content-Type', 'application/json');
    res.json({
      message: 'API endpoint testing completed',
      results: results,
      summary: {
        total: testEndpoints.length,
        successful: results.filter(r => r.status && r.status < 400).length,
        htmlResponses: results.filter(r => r.isHtml).length,
        jsonResponses: results.filter(r => r.isJson).length
      }
    });
    
  } catch (error) {
    console.error('💥 Direct API test error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying India WRIS API requests`);
  console.log(`🔗 Use: http://localhost:${PORT}/api/groundWaterLevel`);
  console.log(`🔗 Or: http://localhost:${PORT}/proxy/Dataset/Ground Water Level`);
  console.log(`🧪 Test API directly: POST http://localhost:${PORT}/test-api`);
  console.log(`📋 Correct API endpoint: https://indiawris.gov.in/Dataset/Ground Water Level`);
  console.log(`📋 Method: POST with empty body`);
  console.log(`💡 Dependencies already added to package.json`);
});
