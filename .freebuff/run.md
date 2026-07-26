# Run Instructions — Myntra Clone

## Reproduce the artifacts

No environment files (`.env`, `.env.local`) are required to start the frontend. The backend URL defaults to `http://127.0.0.1:8000` via `craco.config.js`.

Dependencies are **not installed** in this worktree yet. To install them:

```bash
# Install frontend dependencies
cd /path/to/project
npm install
```

The backend needs Python dependencies:

```bash
cd backend
pip install -r requirements.txt
```

## How to run the server

### Frontend (React + Craco)

```bash
cd /path/to/project
npm start
```

This runs `craco start`. The frontend starts on **port 3000** by default.

### Backend (Python FastAPI)

```bash
cd /path/to/project/backend
python server.py
```

This starts the API server on **port 8000**.

### Full stack

The frontend proxies `/api` requests to the backend at `http://127.0.0.1:8000` (configured in `craco.config.js` under `devServer.proxy`).

### Preview URL

```
http://localhost:3000
```
