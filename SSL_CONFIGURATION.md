# SSL/HTTPS Configuration for ShopTrack Frontend

This document describes the SSL/TLS configuration for the ShopTrack Vue.js frontend application, including HTTPS API connections and optional HTTPS dev server setup.

## Overview

The ShopTrack frontend is configured to:
- Connect to the backend API over HTTPS (port 5201)
- Handle self-signed certificates in development
- Optionally serve the frontend over HTTPS
- Properly proxy API requests through Vite

## API Connection Configuration

### Environment Variables

The frontend uses environment variables to configure the API connection:

```bash
# shoptrack-frontend/.env
VITE_API_PORT=5201

# Optional: Override the entire API URL
# VITE_API_URL=https://localhost:5201/api
```

### API Service Configuration

The Axios HTTP client is configured to use HTTPS:

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 
    `https://localhost:${import.meta.env.VITE_API_PORT || '5298'}/api`,
  timeout: 15000,
  withCredentials: true, // Send cookies for authentication
});
```

### CSRF Token Service Configuration

The CSRF token service also uses HTTPS:

```typescript
// src/composables/useCsrfToken.ts
private async fetchTokenFromBackend(): Promise<BackendCsrfResponse> {
  const baseUrl = import.meta.env.VITE_API_URL || 
    `https://localhost:${import.meta.env.VITE_API_PORT || '5298'}/api`;
  
  const response = await fetch(`${baseUrl}/security/csrf-token`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  // ...
}
```

## Vite Proxy Configuration

### Development Proxy Setup

Vite is configured to proxy API requests to the HTTPS backend:

```typescript
// vite.config.ts
export default defineConfig({
  // ... other config
  server: {
    proxy: {
      "/api": {
        target: `https://localhost:${process.env.VITE_API_PORT || '5201'}`,
        changeOrigin: true,
        secure: false, // IMPORTANT: Allows self-signed certificates in development
      },
    },
  },
});
```

### Key Proxy Settings Explained

- **target**: The HTTPS URL of the backend API
- **changeOrigin**: Changes the origin header to match the target
- **secure: false**: Disables SSL certificate verification (required for self-signed certs)

## Running the Frontend with HTTPS Backend

### Standard Development Setup

1. Ensure the backend is running with HTTPS:
   ```bash
   # In ShopTrack.Api directory
   HTTP_PORT=5200 HTTPS_PORT=5201 dotnet watch
   ```

2. Start the frontend development server:
   ```bash
   # In shoptrack-frontend directory
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

The frontend runs on HTTP (port 5173) but connects to the backend via HTTPS (port 5201).

### Using Different API Ports

To use a different API port:

1. Update the `.env` file:
   ```bash
   VITE_API_PORT=5203
   ```

2. Restart the development server:
   ```bash
   npm run dev
   ```

## Optional: HTTPS Frontend Development Server

While not required, you can also run the Vite dev server with HTTPS:

### Method 1: Using Vite Plugin

1. Install the Vite plugin for HTTPS:
   ```bash
   npm install -D @vitejs/plugin-basic-ssl
   ```

2. Update `vite.config.ts`:
   ```typescript
   import basicSsl from '@vitejs/plugin-basic-ssl';
   
   export default defineConfig({
     plugins: [
       vue(),
       basicSsl() // Generates a self-signed certificate
     ],
     server: {
       https: true,
       // ... proxy config
     }
   });
   ```

### Method 2: Using Custom Certificates

1. Create certificates for the frontend:
   ```bash
   # In shoptrack-frontend directory
   mkdir certs
   cd certs
   
   openssl req -x509 -newkey rsa:4096 \
     -keyout localhost-key.pem \
     -out localhost.pem \
     -days 365 -nodes \
     -subj "/CN=localhost"
   ```

2. Update `vite.config.ts`:
   ```typescript
   import fs from 'fs';
   
   export default defineConfig({
     server: {
       https: {
         key: fs.readFileSync('./certs/localhost-key.pem'),
         cert: fs.readFileSync('./certs/localhost.pem'),
       },
       // ... proxy config
     }
   });
   ```

3. Access the application at `https://localhost:5173`

## Environment-Specific Configurations

### Development Environment

```javascript
// .env.development
VITE_API_PORT=5201
VITE_API_URL=  # Leave empty to use default construction
```

### Production Environment

```javascript
// .env.production
VITE_API_URL=https://api.shoptrack.com/api
```

### Staging Environment

```javascript
// .env.staging
VITE_API_URL=https://staging-api.shoptrack.com/api
```

## Handling Self-Signed Certificates

### Browser Warnings

When using self-signed certificates, browsers will show security warnings:

1. **First-time Setup**:
   - Visit the API directly: `https://localhost:5201/api/docs`
   - Accept the certificate warning
   - The frontend can now communicate with the API

2. **Browser-Specific Instructions**:
   - **Chrome**: "Advanced" → "Proceed to localhost"
   - **Firefox**: "Advanced" → "Accept the Risk"
   - **Safari**: "Show Details" → "visit this website"

### Axios Configuration for Self-Signed Certificates

The current configuration handles self-signed certificates through the Vite proxy with `secure: false`. No additional Axios configuration is needed.

## CORS Configuration

### Backend CORS Settings

The backend must allow the frontend origin:

```csharp
// Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVue", policy =>
    {
        policy.SetIsOriginAllowed(origin => 
            origin.StartsWith("http://localhost:") || 
            origin.StartsWith("https://localhost:"))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
```

### Frontend Credentials

The frontend sends credentials with all requests:

```typescript
// src/services/api.ts
const api = axios.create({
  // ...
  withCredentials: true, // IMPORTANT: Sends cookies for authentication
});
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "ERR_CERT_AUTHORITY_INVALID" in Browser

**Problem**: Browser doesn't trust the self-signed certificate.

**Solution**: 
- Visit the API URL directly (`https://localhost:5201/api/docs`)
- Accept the certificate warning
- Refresh the frontend application

#### 2. "ECONNREFUSED" or "Network Error"

**Problem**: Frontend cannot connect to the backend.

**Solutions**:
- Verify the backend is running on the expected port
- Check the `VITE_API_PORT` in `.env` matches the backend port
- Ensure the Vite proxy configuration is correct

#### 3. "CORS Policy" Errors

**Problem**: Cross-Origin Resource Sharing blocking requests.

**Solutions**:
- Ensure `withCredentials: true` in Axios config
- Verify backend CORS policy includes the frontend origin
- Check that credentials are included in fetch requests

#### 4. "Invalid Host Header" in Development

**Problem**: Vite dev server rejects requests.

**Solution**: Add to `vite.config.ts`:
```typescript
server: {
  hmr: {
    host: 'localhost',
  },
  host: true,
}
```

#### 5. Mixed Content Warnings

**Problem**: HTTPS backend with HTTP frontend causing mixed content.

**Solution**: This is normal in development. The Vite proxy handles this correctly.

### Debug Tips

1. **Check Network Tab**: 
   - Open browser DevTools → Network tab
   - Look for failed requests to `/api/*`
   - Check if they're being proxied correctly

2. **Verify Proxy is Working**:
   ```javascript
   // In browser console
   fetch('/api/health').then(r => r.text()).then(console.log)
   ```

3. **Test Direct API Access**:
   ```bash
   curl -k https://localhost:5201/api/health
   ```

4. **Enable Axios Request Logging**:
   ```typescript
   // src/services/api.ts
   api.interceptors.request.use(request => {
     console.log('Starting Request:', request);
     return request;
   });
   ```

## Production Deployment

### SSL Certificate Requirements

For production:

1. **Use Real Certificates**: Obtain certificates from a trusted CA (Let's Encrypt, etc.)
2. **Update API URL**: Set `VITE_API_URL` to the production API endpoint
3. **Remove Development Settings**:
   - Remove `secure: false` from proxy configuration
   - Remove self-signed certificate acceptance code

### Build Configuration

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Environment Variable Injection

During build, Vite replaces `import.meta.env.VITE_*` variables:

```javascript
// This code:
const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:5201/api';

// Becomes (in production):
const apiUrl = 'https://api.shoptrack.com/api';
```

## Security Best Practices

### Development

1. **Self-Signed Certificates**: Acceptable for local development
2. **Secure: false**: Only use in development for self-signed certs
3. **Credentials**: Always send cookies for authentication
4. **HTTPS API**: Always use HTTPS, even in development

### Production

1. **Valid SSL Certificates**: Use certificates from trusted CAs
2. **Strict SSL Verification**: Remove `secure: false` settings
3. **HTTPS Only**: Serve both frontend and API over HTTPS
4. **CSP Headers**: Implement Content Security Policy
5. **HSTS**: Enable HTTP Strict Transport Security

## File Structure

```
shoptrack-frontend/
├── .env                    # Environment variables
├── .env.development       # Development overrides
├── .env.production        # Production configuration
├── vite.config.ts         # Vite and proxy configuration
├── src/
│   ├── services/
│   │   └── api.ts        # Axios HTTPS configuration
│   └── composables/
│       └── useCsrfToken.ts  # CSRF token HTTPS fetching
└── certs/                 # Optional: Frontend certificates
    ├── localhost.pem
    └── localhost-key.pem
```

## Quick Reference

### Essential Commands

```bash
# Start frontend (connects to HTTPS backend)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run with different API port
VITE_API_PORT=5203 npm run dev
```

### Configuration Checklist

- [x] `.env` file has correct `VITE_API_PORT`
- [x] `api.ts` uses `https://` protocol
- [x] `vite.config.ts` proxy targets HTTPS with `secure: false`
- [x] `withCredentials: true` in Axios config
- [x] Backend CORS allows frontend origin
- [x] Backend is running on expected HTTPS port

## Related Documentation

- [SSL Certificate Setup for Backend](../SSL_CERTIFICATE_SETUP.md)
- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Axios Request Config](https://axios-http.com/docs/req_config)
- [Vue.js Deployment Guide](https://vuejs.org/guide/best-practices/production-deployment.html)