# Deployment Guide for Web Application Leafy

## Overview
This project consists of 3 main services:
1. **Node.js API Server** (`api/database.js`) - Port 3001 - Handles API requests and database operations
2. **Node.js Web Server** (`api/index.js`) - Port 8000 - Serves HTML files and proxies API requests
3. **Python Model Server** (`api/model_server.py`) - Port 5000 - Handles ML model predictions

---

## 🚀 Render.com Service Recommendations

### Recommended Architecture:
1. **Backend API Service (Node.js)** - Use **Web Service** on Render
   - Deploy `api/database.js` as the main service
   - This handles both API and database connections
   - Render will assign a port via `process.env.PORT`

2. **Python Model Server** - Use **Web Service** on Render (separate service)
   - Deploy `api/model_server.py` as a separate service
   - This allows independent scaling and management

3. **MySQL Database** - Use **MySQL Database** addon on Render
   - Or use an external MySQL service (AWS RDS, PlanetScale, etc.)

4. **Frontend/Static Files** - Can be served from the same Node.js service or separately
   - Option A: Serve from `api/index.js` (combine with API server)
   - Option B: Deploy as static site on Render or use a CDN

---

## 📋 Constants/Parameters to Change for Deployment

### 1. **api/database.js** (Main API Server)

#### Port Configuration:
- **Line 6**: `const port = 3001;`
  - **Change to**: `const port = process.env.PORT || 3001;`

#### MySQL Database Connection (Lines 73-82):
```javascript
host: "localhost",           // ❌ Change to process.env.DB_HOST
user: "root",                 // ❌ Change to process.env.DB_USER
password: databasepassword,   // ✅ Already reading from file, but should use env var
database: "app_database",     // ❌ Change to process.env.DB_NAME
```

**Required Environment Variables:**
- `DB_HOST` - Your MySQL hostname (from Render MySQL service)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password (or read from env file)
- `DB_NAME` - Database name
- `DB_PORT` - Database port (default 3306)

#### CORS Configuration (Line 68):
```javascript
origin: ['http://localhost:5501', 'http://127.0.0.1:5501', 'http://localhost:8000', 'http://192.168.1.33:8081'],
```
- **Change to**: Include your production frontend URLs
- Use environment variable for allowed origins

#### JWT Secret (Line 105):
```javascript
const token = jwt.sign({ id: user.user_id, is_guest: user.is_guest }, "your_secret", { expiresIn: "1h" });
```
- **Change to**: `process.env.JWT_SECRET || "your_secret"`
- **IMPORTANT**: Set a strong secret in production

#### Image Storage Path (Line 18):
```javascript
const imagesDir = path.join(__dirname, '..', 'src', 'images');
```
- **Consider**: Using cloud storage (AWS S3, Cloudinary, etc.) for production
- Current approach stores in filesystem (works but not scalable)

#### Image URL Generation (Lines 68, 110 in model.js):
```javascript
leaf_image_url: `http://127.0.0.1:3001/${vegRows[0].image_leaf_path.replace('../src/', '')}`
```
- **Change to**: Use `process.env.API_URL` or `process.env.BASE_URL`

---

### 2. **api/index.js** (Web Server/Static File Server)

#### Port Configuration (Line 71):
```javascript
server.listen(8000,'localhost',()=>{...})
```
- **Change to**: `server.listen(process.env.PORT || 8000, '0.0.0.0', () => {...})`

#### API Proxy Configuration (Lines 12-14):
```javascript
hostname: '127.0.0.1',
port: 3001,
```
- **IMPORTANT**: If deploying as separate services, change `hostname` to the API service URL
- **Option**: Use environment variable `process.env.API_URL` or `process.env.API_HOST`

**If combining services**: You can merge `index.js` into `database.js` and serve static files from the same server.

---

### 3. **api/model_server.py** (Python ML Model Server)

#### Port Configuration (Line 83):
```python
app.run(host='0.0.0.0', port=5000)
```
- **Change to**: `app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))`

#### Model Path (Line 22):
- Ensure `model/plant_mv2_float32.tflite` is included in deployment
- Path is already relative: `os.path.join(os.path.dirname(__file__), '..', 'model', 'plant_mv2_float32.tflite')`

---

### 4. **api/model.js** (Model Route Handler)

#### Python Server URL (Line 7):
```javascript
const PYTHON_SERVER_URL = 'http://127.0.0.1:5000/predict';
```
- **Change to**: `process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:5000/predict'`
- Set this to your deployed Python service URL on Render

#### Image URLs (Lines 68, 110):
```javascript
leaf_image_url: `http://127.0.0.1:3001/${vegRows[0].image_leaf_path.replace('../src/', '')}`
image_leaf_url: `http://127.0.0.1:3001/${plantData.image_leaf_path.replace('../src/', '')}`
```
- **Change to**: Use `process.env.BASE_URL` or `process.env.API_URL`

---

### 5. **web/script/config.js** (Frontend Config)

#### API Base URL (Lines 6-7):
```javascript
if (origin.includes('5501') || origin.includes('127.0.0.1:5501') || origin.includes('localhost:5501')) {
  window.API_BASE = 'http://127.0.0.1:3001';
```
- Already handles production (sets to `null` for same-origin)
- If frontend is on different domain, add production origin check

---

### 6. **Flutter: api_service.dart**

#### Base URL (Line 6):
```dart
static const String _baseUrl = "http://192.168.51.152:3001";
```
- **Change to**: Your Render API service URL (e.g., `https://your-api-service.onrender.com`)
- **Recommendation**: Use environment-specific config or build flavors

---

## 🔧 Environment Variables Required

Create a `.env` file or set in Render dashboard:

### For Node.js API Service:
```env
PORT=3001
DB_HOST=your-mysql-host.onrender.com
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=app_database
DB_PORT=3306
JWT_SECRET=your-strong-secret-key-here
BASE_URL=https://your-api-service.onrender.com
PYTHON_SERVER_URL=https://your-python-service.onrender.com/predict
CORS_ORIGINS=https://your-frontend.onrender.com,https://your-frontend.com
NODE_ENV=production
```

### For Python Model Service:
```env
PORT=5000
MODEL_PATH=./model/plant_mv2_float32.tflite
```

---

## 📁 Image Storage Recommendations

### Current Setup:
- Images stored in `../src/images` (filesystem)
- ✅ Works for development
- ❌ Not scalable for production (lost on server restart, limited storage)

### Production Options:

1. **Cloud Storage (Recommended)**:
   - AWS S3
   - Cloudinary
   - Render Disk Storage (persistent but not ideal for scaling)

2. **Database Storage**:
   - Store images as base64 or binary in MySQL (not recommended for large images)

3. **CDN + Object Storage**:
   - Upload to S3/Cloudinary → Serve via CDN
   - Update image paths in database to point to CDN URLs

### Implementation Steps:
1. Install storage SDK (e.g., `aws-sdk` for S3)
2. Modify upload endpoints in `database.js` to upload to cloud storage
3. Update image URL generation to use cloud storage URLs
4. Migrate existing images to cloud storage

---

## 🚢 Render.com Deployment Steps

### Step 1: Prepare MySQL Database
1. Create MySQL database on Render
2. Note connection details (host, user, password, database name)
3. Run your database migrations/setup

### Step 2: Deploy Python Model Server
1. Create new **Web Service** on Render
2. Connect your GitHub repository
3. **Build Command**: `pip install -r requirements.txt` (create this file)
4. **Start Command**: `python api/model_server.py`
5. Set environment variables (PORT)
6. Note the service URL (e.g., `https://model-server.onrender.com`)

### Step 3: Deploy Node.js API Server
1. Create new **Web Service** on Render
2. Connect your GitHub repository
3. **Build Command**: `npm install`
4. **Start Command**: `node api/database.js`
5. Set all environment variables (see above)
6. Set `PYTHON_SERVER_URL` to your Python service URL
7. Note the service URL (e.g., `https://api-service.onrender.com`)

### Step 4: Deploy Frontend (Optional - if separate)
1. Create new **Static Site** on Render
2. Point to `web` directory
3. Update CORS in API service to include frontend URL
4. Or: Combine with API server (modify `database.js` to serve static files)

### Step 5: Update Flutter App
1. Update `_baseUrl` in `api_service.dart` to your Render API URL
2. Rebuild APK with new configuration

---

## 📝 Files to Create/Modify

### 1. Create `requirements.txt`:
```txt
flask==3.0.0
tensorflow==2.15.0
numpy==1.24.3
Pillow==10.1.0
gunicorn==21.2.0
```

### 2. Create `render.yaml` (Optional - for infrastructure as code):
```yaml
services:
  - type: web
    name: api-server
    env: node
    buildCommand: npm install
    startCommand: node api/database.js
    envVars:
      - key: PORT
        value: 3001
      - key: DB_HOST
        sync: false
      # ... other env vars

  - type: web
    name: model-server
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn api.model_server:app --bind 0.0.0.0:$PORT
    envVars:
      - key: PORT
        value: 5000
```

### 3. Modify package.json scripts:
```json
{
  "scripts": {
    "start": "node api/database.js",
    "dev": "nodemon api/database.js"
  }
}
```

---

## ⚠️ Important Notes

1. **Render Free Tier Limitations**:
   - Services sleep after 15 minutes of inactivity
   - First request after sleep can be slow (cold start)
   - Consider paid tier for production

2. **Database Connection**:
   - Render MySQL is not persistent on free tier
   - Consider external MySQL (PlanetScale, AWS RDS) for production

3. **Image Storage**:
   - Render disk storage is ephemeral (lost on redeploy)
   - Use cloud storage for production

4. **Service Communication**:
   - Services on Render can communicate via internal URLs
   - For Python service, use the Render-assigned URL in `PYTHON_SERVER_URL`

5. **Environment Variables**:
   - Never commit `.env` files to Git
   - Use Render's environment variable management

---

## 🔍 Checklist Before Deployment

- [ ] All hardcoded IPs/localhost URLs replaced with environment variables
- [ ] Database credentials moved to environment variables
- [ ] JWT secret changed from default
- [ ] CORS origins updated for production domains
- [ ] Python server URL configurable
- [ ] Image storage strategy decided (cloud vs filesystem)
- [ ] Flutter app base URL updated
- [ ] `requirements.txt` created for Python dependencies
- [ ] All environment variables set in Render dashboard
- [ ] Test database connection from deployed service
- [ ] Test Python model server accessibility
- [ ] Test image upload/download flow
- [ ] Verify CORS allows frontend requests

---

## 📞 Troubleshooting

### Issue: Database connection fails
- Check DB_HOST includes port if needed
- Verify firewall rules allow Render IPs
- Test connection with MySQL client

### Issue: Python service not reachable
- Check Python service is running (check logs)
- Verify PORT environment variable
- Test `/predict` endpoint directly

### Issue: Images not loading
- Check image paths in database
- Verify static file serving is configured
- Check file permissions
- Consider using absolute URLs with BASE_URL

### Issue: CORS errors
- Verify CORS_ORIGINS includes your frontend URL
- Check preflight requests are handled
- Verify credentials setting matches frontend

---

## 🎯 Next Steps

1. Review and apply all changes listed above
2. Test locally with environment variables
3. Deploy to Render step by step
4. Update Flutter app configuration
5. Test end-to-end functionality
6. Monitor logs and performance

