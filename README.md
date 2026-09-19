# Algorbit — Interactive Graph Algorithm Visualizer & AI Learning Platform

<p align="center">
  <img src="frontend/public/logo.svg" alt="Algorbit Logo" width="96" height="96" />
</p>

<p align="center">
  <b>A full-stack, interactive graph theory visualization and learning platform with step-by-step execution, synchronized pseudocode, AI tutoring, and quizzes.</b>
</p>

<p align="center">
  <a href="https://mateivarvara100-cloud.github.io/graphsalgvisualizer/"><strong>Explore the Live Demo »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black&style=flat-square" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white&style=flat-square" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white&style=flat-square" alt="Python" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white&style=flat-square" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Google_Gemini-AI_Tutor-4285F4?logo=google&logoColor=white&style=flat-square" alt="Gemini" />
  <img src="https://img.shields.io/badge/GitHub_Pages-Hosted-222222?logo=github&logoColor=white&style=flat-square" alt="GitHub Pages" />
  <img src="https://img.shields.io/badge/Render-Backend_Live-46E3B7?logo=render&logoColor=white&style=flat-square" alt="Render" />
</p>

---

## 🌐 Live Deployments

- **Frontend (GitHub Pages):** [https://mateivarvara100-cloud.github.io/graphsalgvisualizer/](https://mateivarvara100-cloud.github.io/graphsalgvisualizer/)
- **Backend API (Render):** [https://algorbit.onrender.com/](https://algorbit.onrender.com/)
- **API Health Check:** [https://algorbit.onrender.com/api/health](https://algorbit.onrender.com/api/health)

---

## ✨ Features

### 🎨 Interactive Graph Canvas
- **Dynamic Manipulation:** Add, move, edit, and delete nodes and weighted/unweighted edges in real time.
- **Support for All Graph Types:** Directed, undirected, weighted, and unweighted graphs with cycle and connectivity handling.
- **Preset Libraries:** Load standard topology presets (Bipartite, Complete, Trees, Cycles, DAGs, Disconnected).
- **Physics & Navigation:** Zoom, pan, snap-to-grid, and physics-assisted force simulation.

### ⚡ 9 Classical Graph Algorithms
Every algorithm runs step-by-step with state visualization, pseudocode highlighting, and detailed step-by-step logs:
1. **Breadth-First Search (BFS)** — Level-order traversal and shortest path in unweighted graphs.
2. **Depth-First Search (DFS)** — Deep-path exploration, recursion stack tracing, cycle detection.
3. **Dijkstra's Algorithm** — Single-source shortest path with minimum priority queue inspection.
4. **Floyd-Warshall Algorithm** — All-pairs shortest path with dynamic programming distance matrix display.
5. **Kruskal's Algorithm** — Minimum Spanning Tree (MST) with Disjoint Set Union (DSU) cycle checks.
6. **Prim's Algorithm** — Minimum Spanning Tree (MST) via greedy cut-edge expansion.
7. **Ford-Fulkerson** — Max flow computation using augmenting paths and residual graphs.
8. **Edmonds-Karp** — BFS-optimized implementation of Ford-Fulkerson ensuring polynomial time.
9. **Tarjan's & Kosaraju's Algorithms** — Strongly Connected Components (SCC) in directed graphs.

### 🤖 AI Learning Assistant
- Integrated floating assistant powered by the Google Gemini API.
- Explains current algorithm steps, graph properties, algorithmic time/space complexities, and proofs.
- Markdown rendering with inline code and LaTeX math styling.

### 📝 Interactive Quiz & Assessment System
- Multiple-choice quizzes categorized by algorithm and difficulty level.
- Instant feedback with detailed explanations for correct and incorrect answers.
- Score tracking persisted to user accounts via MongoDB.

### 📱 100% Mobile Responsive & Touch Optimized
- **Adaptive Layouts:** Flawlessly responsive across smartphones, tablets, laptops, and ultra-wide desktop monitors.
- **Touch-Friendly Controls:** Smooth touch-pan, pinch-to-zoom, and tap interactions on the graph canvas.
- **Mobile-Tailored UI:** Collapsible drawer navigation, floating action buttons with pulsating glowing indicators, bottom-right expandable legend, and swipe-friendly quiz modals.

### 🛡️ Production Security & Authentication
- **OAuth 2.0:** One-click sign-in via Google Identity Services.
- **Email/Password Auth:** Secure password hashing with `bcrypt` (work factor 12).
- **Session Tokens:** Stateless `JWT` (JSON Web Tokens) with cryptographically secure secret signing.
- **Password Recovery:** 6-digit cryptographic OTP generation delivered via SMTP with expiration windows.
- **Defense in Depth:**
  - Rate limiting via sliding-window algorithm on compute-heavy routes.
  - Granular CORS policies for production domains.
  - HTTP Security Headers: Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options.
  - Zero secrets committed: complete decoupling with `.env` and environment configuration.

---

## 🛠️ Architecture & Tech Stack

```
graphsalgvisualizer/
├── .github/workflows/
│   └── deploy.yml          # Automated CI/CD pipeline for GitHub Pages
├── backend/
│   ├── algorithms/         # Pure Python algorithm implementations (BFS, DFS, Dijkstra, etc.)
│   ├── auth.py             # JWT token handling & bcrypt security
│   ├── auth_routes.py      # Registration, login, password-reset, OAuth endpoints
│   ├── assistant_routes.py # Gemini AI streaming/chat endpoint
│   ├── database.py         # MongoDB connection & collection abstractions
│   ├── email_service.py    # SMTP email delivery for OTP verification
│   ├── quiz_routes.py      # Quiz questions, evaluation, and user score persistence
│   ├── main.py             # FastAPI entrypoint, middleware, rate-limiters, algorithm endpoints
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── public/             # Static assets, favicon, manifest, index.html
    ├── src/
    │   ├── components/     # Canvas, AI Assistant, Controls, Navbar, Modals
    │   ├── context/        # React context (Auth, Quiz, Theme)
    │   ├── hooks/          # Custom hooks (useGraphEditor, useAlgorithm, useViewport)
    │   ├── styles/         # SCSS design system, dark-mode tokens, animations
    │   └── App.jsx         # Root component & routing
    └── package.json        # Frontend dependencies & scripts
```

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18, JavaScript (ES6+), HTML5 Canvas |
| **Styling** | Vanilla SCSS, CSS Modules, Custom Design Tokens |
| **Icons & Media** | Lucide React, Custom Vector SVGs |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic v2 |
| **Database** | MongoDB Atlas (Production) / `mongomock` (Fallback) |
| **Authentication** | JWT (PyJWT), Bcrypt, Google OAuth 2.0 |
| **AI Integration** | Google Generative Language API (Gemini 2.5 Flash) |
| **Hosting & CI/CD** | GitHub Pages (Frontend), Render (Backend), GitHub Actions |

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** v18+ and `npm`
- **Python** 3.10+
- **MongoDB** instance (local or MongoDB Atlas connection string)

---

### 1. Clone the Repository
```bash
git clone https://github.com/mateivarvara100-cloud/graphsalgvisualizer.git
cd graphsalgvisualizer
```

---

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Create your .env file from the template
cp .env.example .env
```

Open `backend/.env` and supply your variables:
```env
ENVIRONMENT=development
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/algorbit?retryWrites=true&w=majority
GEMINI_API_KEY=your_gemini_api_key
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Start the FastAPI backend server:
```bash
uvicorn main:app --reload --port 8000
```
Backend will be available at [http://localhost:8000](http://localhost:8000).

---

### 3. Frontend Setup
```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install npm dependencies
npm install

# Create your .env file from the template
cp .env.example .env
```

Configure `frontend/.env`:
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

Run the development server:
```bash
npm start
```
Frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing & Code Quality

```bash
# Run backend tests
cd backend
pytest

# Check frontend linting
cd frontend
npm run lint
```

---

## 📦 Deployment

- **Frontend**: Automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Any push to `main` triggers a build and deploys to GitHub Pages.
- **Backend**: Hosted on [Render](https://render.com) as a Python Web Service linked directly to the `backend/` directory of this repository.

---

## 📄 License

This project is licensed under the MIT License — feel free to use it for learning, research, or personal projects.
