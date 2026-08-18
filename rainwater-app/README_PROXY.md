# India WRIS API Proxy Setup

## Problem
The India WRIS API has CORS (Cross-Origin Resource Sharing) restrictions that prevent direct browser access. This is a common security measure for government APIs.

## Solution
Use a backend proxy server to bypass CORS restrictions.

## Setup Instructions

### Option 1: Quick Start (Recommended)
```bash
# Install dependencies
npm install

# Start both proxy and dev server together
npm start
```

### Option 2: Manual Setup
```bash
# Install dependencies
npm install

# Terminal 1: Start proxy server
npm run proxy

# Terminal 2: Start development server
npm run dev
```

### Option 3: Using Concurrently
```bash
# Install dependencies
npm install

# Start both servers with concurrently
npm run dev:full
```

### 3. Test the Proxy
Visit `http://localhost:3001/health` to verify the proxy is running.

### 4. Use the Application
Now when you click "Test API" or "Fetch Real Data", the application will try the local proxy first.

## How It Works

1. **Frontend** makes request to `http://localhost:3001/api/groundWaterLevel`
2. **Proxy Server** forwards the request to `https://indiawris.gov.in/wris/api/groundWaterLevel`
3. **India WRIS API** responds to the proxy server
4. **Proxy Server** forwards the response back to the frontend

## Alternative Solutions

### Option 1: Use a CORS Browser Extension
- Install a CORS browser extension (for development only)
- Not recommended for production

### Option 2: Use a Public CORS Proxy
- The application already tries several public CORS proxies
- These may be unreliable or rate-limited

### Option 3: Backend Integration
- Integrate the API calls into your backend server
- Most secure and reliable approach for production

## Production Deployment

For production, you should:
1. Deploy the proxy server to your backend infrastructure
2. Update the frontend to use your production proxy URL
3. Add authentication and rate limiting to the proxy
4. Consider caching API responses for better performance

## Troubleshooting

### Proxy Server Won't Start
- Check if port 3001 is already in use
- Install missing dependencies: `npm install express http-proxy-middleware cors`

### API Still Returns Mock Data
- Verify the proxy server is running: `curl http://localhost:3001/health`
- Check browser console for error messages
- Ensure the India WRIS API is accessible from your network

### CORS Errors Persist
- The India WRIS API may have additional restrictions
- Try different parameter combinations
- Check if the API endpoint has changed
