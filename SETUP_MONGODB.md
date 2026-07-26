# MongoDB Setup Guide

## Option 1: Using MongoDB Community Server (Windows)

### Step 1: Download MongoDB Community Server
1. Visit: https://www.mongodb.com/try/download/community
2. Select:
   - Version: Latest (or your preferred version)
   - OS: Windows x64
   - Package: MSI
3. Download and run the installer

### Step 2: Install MongoDB
- Choose "Complete" installation
- Check "Install MongoDB as a Service"
- MongoDB will start automatically as a service

### Step 3: Verify Installation
```powershell
mongod --version
```

### Step 4: Start MongoDB (if not running as service)
```powershell
mongod --dbpath C:\data\db
```

---

## Option 2: Using MongoDB Atlas (Cloud - Recommended for Development)

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a cluster
4. Get your connection string
5. Update `.env` file:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Option 3: Using Chocolatey

If you have Chocolatey installed:

```powershell
choco install mongodb
```

Then start MongoDB:
```powershell
mongod
```

---

## Option 4: Docker (if Docker is installed)

```powershell
docker run -d -p 27017:27017 --name myntra-mongo mongo:latest
```

---

## Troubleshooting

### MongoDB not starting on port 27017?
- Check if another process is using the port:
  ```powershell
  netstat -ano | findstr :27017
  ```

### "Failed to connect" error?
- Ensure MongoDB is running: `mongod`
- Check MongoDB is listening on 127.0.0.1:27017
- Verify MONGO_URL in `.env` file

### Still getting ERR_CONNECTION_REFUSED?
1. Stop the frontend and backend servers
2. Start MongoDB first
3. Start the backend server: `python backend/server.py`
4. Start the frontend server: `npm start`

---

## Quick Start (After MongoDB is installed)

1. **Start MongoDB:**
   ```powershell
   mongod
   ```
   
2. **In a new terminal, start the backend:**
   ```powershell
   cd backend
   python server.py
   ```
   
3. **In another terminal, start the frontend:**
   ```powershell
   npm start
   ```

The app should now be available at `http://localhost:3000`
