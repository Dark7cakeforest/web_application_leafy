# Quick Reference: Constants to Change for Deployment

## 🔴 Critical Changes Required

### 1. **api/database.js**

| Line | Current Value | Change To | Reason |
|------|--------------|-----------|--------|
| 6 | `const port = 3001;` | `const port = process.env.PORT \|\| 3001;` | Render assigns port dynamically |
| 74 | `host: "localhost"` | `host: process.env.DB_HOST` | Use production database host |
| 75 | `user: "root"` | `user: process.env.DB_USER` | Use production database user |
| 76 | `password: databasepassword` | `password: process.env.DB_PASSWORD` | Use environment variable for security |
| 77 | `database: "app_database"` | `database: process.env.DB_NAME` | Configurable database name |
| 68 | CORS origins array | `origin: process.env.CORS_ORIGINS?.split(',') \|\| [...]` | Allow production frontend |
| 105 | `"your_secret"` | `process.env.JWT_SECRET \|\| "your_secret"` | Secure JWT secret |
| 18 | Image directory path | Keep same OR use cloud storage | Filesystem vs cloud storage |

### 2. **api/model.js**

| Line | Current Value | Change To | Reason |
|------|--------------|-----------|--------|
| 7 | `'http://127.0.0.1:5000/predict'` | `process.env.PYTHON_SERVER_URL \|\| 'http://127.0.0.1:5000/predict'` | Python service URL on Render |
| 68 | `http://127.0.0.1:3001/...` | `${process.env.BASE_URL \|\| 'http://localhost:3001'}/...` | Dynamic base URL |
| 110 | `http://127.0.0.1:3001/...` | `${process.env.BASE_URL \|\| 'http://localhost:3001'}/...` | Dynamic base URL |

### 3. **api/index.js**

| Line | Current Value | Change To | Reason |
|------|--------------|-----------|--------|
| 13 | `hostname: '127.0.0.1'` | `hostname: process.env.API_HOST \|\| '127.0.0.1'` | API service hostname |
| 14 | `port: 3001` | `port: process.env.API_PORT \|\| 3001` | API service port |
| 71 | `server.listen(8000,'localhost',...)` | `server.listen(process.env.PORT \|\| 8000, '0.0.0.0', ...)` | Render port + bind to all interfaces |

**Note**: If combining services, you can merge `index.js` functionality into `database.js` to avoid proxy complexity.

### 4. **api/model_server.py**

| Line | Current Value | Change To | Reason |
|------|--------------|-----------|--------|
| 83 | `app.run(host='0.0.0.0', port=5000)` | `app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))` | Render assigns port |

### 5. **Flutter: api_service.dart**

| Line | Current Value | Change To | Reason |
|------|--------------|-----------|--------|
| 6 | `"http://192.168.51.152:3001"` | `"https://your-api-service.onrender.com"` | Production API URL |

---

## 📦 Required Environment Variables

Set these in Render.com dashboard for each service:

### Node.js API Service:
```env
PORT=3001
DB_HOST=dpg-xxxxx-a.oregon-postgres.render.com
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=app_database
DB_PORT=3306
JWT_SECRET=generate-strong-random-secret
BASE_URL=https://your-api-service.onrender.com
PYTHON_SERVER_URL=https://your-python-service.onrender.com/predict
CORS_ORIGINS=https://your-frontend.onrender.com
NODE_ENV=production
```

### Python Model Service:
```env
PORT=5000
```

---

## 📝 Files to Create

1. **requirements.txt** (for Python)
2. **.env.example** (template, don't commit actual .env)
3. **render.yaml** (optional, for infrastructure as code)

---

## 🎯 Render.com Service Architecture

1. **Web Service (Node.js)** - Deploy `api/database.js`
   - Start Command: `node api/database.js`
   - Build Command: `npm install`

2. **Web Service (Python)** - Deploy `api/model_server.py`
   - Start Command: `gunicorn api.model_server:app --bind 0.0.0.0:$PORT`
   - Build Command: `pip install -r requirements.txt`

3. **MySQL Database** - Render MySQL addon or external service

---

## ⚠️ Image Storage Decision

**Current**: `../src/images` (filesystem)
- ✅ Works locally
- ❌ Lost on Render redeploy
- ❌ Not scalable

**Recommendation for Production**:
- Use AWS S3, Cloudinary, or similar
- Or use Render Disk Storage (limited scalability)
- Update upload endpoints to save to cloud storage
- Update image URLs to point to cloud storage/CDN

