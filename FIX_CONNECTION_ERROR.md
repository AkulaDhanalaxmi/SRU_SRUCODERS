# MYNTRA - Network Connection Error Fix

## Problem
The frontend is showing `net::ERR_CONNECTION_REFUSED` when trying to connect to `127.0.0.1:8000/api/`.

This means:
- ❌ The backend server is not running
- ❌ MongoDB database is not running or not accessible

## Solution

### Quick Start (3 Steps)

#### Step 1: Start MongoDB
Open a new terminal and run:
```powershell
mongod
```

**If mongod is not found**, see [MongoDB Installation](#mongodb-installation) below.

#### Step 2: Start Backend Server
Open a new terminal in the project root and run:
```powershell
cd backend
python server.py
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

#### Step 3: Start Frontend
Open a new terminal in the project root and run:
```powershell
npm start
```

The app will open at `http://localhost:3000`

---

## MongoDB Installation

### Option A: MongoDB Community Server (Recommended for Windows)

1. Download from: https://www.mongodb.com/try/download/community
2. Run the MSI installer
3. Choose "Install MongoDB as a Service" during installation
4. Restart your computer
5. Run `mongod` in any terminal

### Option B: Chocolatey (if installed)
```powershell
choco install mongodb
mongod
```

### Option C: MongoDB Atlas (Cloud - No Installation)
1. Sign up at: https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env`:
   ```
   MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true
   ```
5. Restart backend server

### Option D: Docker (if Docker is installed)
```powershell
docker run -d -p 27017:27017 --name myntra-mongo mongo:latest
```

---

## Troubleshooting

### "mongod: The term 'mongod' is not recognized"
**Solution:** Install MongoDB (see [MongoDB Installation](#mongodb-installation))

### "Connection refused on port 27017"
**Solution:** Make sure MongoDB is running:
```powershell
mongod
```

### "Backend returns 502 Bad Gateway"
**Solution:** Backend crashed due to MongoDB error. Restart:
1. Stop backend (Ctrl+C)
2. Verify MongoDB is running
3. Restart backend: `python server.py`

### "API calls still failing after backend is running"
**Solution:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+Shift+R)
3. Check backend logs for errors

---

## Batch Scripts (Windows)

Use provided batch files for easier startup:

```powershell
# Start backend (automatically checks MongoDB)
.\start-backend.bat

# Start frontend
.\start-frontend.bat
```

---

## What's Running

When everything is working, you should have 3 processes running:

| Process | Port | Command |
|---------|------|---------|
| MongoDB | 27017 | `mongod` |
| Backend | 8000 | `python server.py` |
| Frontend | 3000 | `npm start` |

Check with:
```powershell
netstat -ano | findstr ":8000\|:3000\|:27017"
```

---

## Still Having Issues?

1. **Verify MongoDB is running:**
   ```powershell
   mongod --version
   ```

2. **Check backend connectivity:**
   ```powershell
   curl http://127.0.0.1:8000/api/health
   ```

3. **Check browser console** for detailed error messages (F12 → Console)

4. **Review backend logs** for errors when starting `python server.py`

5. **See SETUP_MONGODB.md** for detailed setup instructions
