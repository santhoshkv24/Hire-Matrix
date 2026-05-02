# HireMatrix

> A full-stack recruitment management platform that centralizes the complete hiring lifecycle — from job creation to final hiring decision.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.4-green.svg)](https://mongodb.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-gray.svg)](https://expressjs.com/)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Project Structure](#project-structure)

---

## Features

| Feature | Description |
|---------|-------------|
| **Job Management** | Create, publish, and manage job postings with skills, departments, and assignments |
| **Candidate Tracking** | Maintain a centralized talent pool with profiles and resume uploads |
| **Pipeline Board** | Drag-and-drop Kanban board for tracking applications through hiring stages |
| **Interview Scheduling** | Google Calendar integration with automatic Meet link generation |
| **AI Resume Scoring** | Google Gemini-powered evaluation of candidates against job requirements |
| **Interview Feedback** | Structured ratings and recommendations from interviewers |
| **Hiring Decisions** | Controlled decision workflow (pending, selected, rejected) |
| **Notifications** | Dual-channel alerts via in-app messages and email |
| **CSV Exports** | Export hiring data for reporting and analysis |
| **Role-Based Access** | Five distinct roles with appropriate permissions |

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express 5 | Web framework |
| MongoDB + Mongoose | Database and ODM |
| Zod | Request validation |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Multer | File uploads |
| Nodemailer | Email delivery |
| Google APIs | Calendar + Meet integration |
| @google/genai | AI resume scoring |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool |
| React Router | Client-side routing |
| Tailwind CSS v4 | Styling |
| dnd-kit | Drag-and-drop pipeline |
| lucide-react | Icon library |
| framer-motion | Animations |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (Vite, Tailwind, React Router)             │
└─────────────────────┬───────────────────────────────────┘
                      │ REST /api/v1
┌─────────────────────▼───────────────────────────────────┐
│                   Express Backend                        │
│         (Controllers → Services → Models)               │
└──────────┬──────────────────┬──────────────────┬────────┘
           │                  │                  │
    ┌──────▼──────┐   ┌───────▼──────┐   ┌────▼─────────┐
    │   MongoDB   │   │   Email +    │   │   Google     │
    │  Database   │   │   Calendar   │   │   Gemini AI  │
    └─────────────┘   └──────────────┘   └──────────────┘
```

### Request Flow

```
HTTP Request → CORS + Helmet → Auth Middleware → Validation → Controller → Service → Model → MongoDB
                                                              ↓
                                                      External Services
                                                      (Email / Calendar / AI)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **MongoDB** (local installation or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd HireMatrix

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend** — Create `backend/.env`:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/hirematrix
CORS_ORIGIN=http://localhost:5173

JWT_SECRET=your-secure-access-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret

ADMIN_EMAIL=admin@hirematrix.local
ADMIN_PASSWORD=YourSecurePassword123!

# Optional: Email
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Optional: Google Calendar + Meet
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Optional: AI Scoring
GOOGLE_GENAI_USE_VERTEXAI=false
SCORING_MODEL=gemini-2.5-flash
```

**Frontend** — Create `frontend/.env` (optional):

```env
VITE_API_URL=http://localhost:4000/api/v1
```

### 3. Run the Application

```bash
# Terminal 1 — Backend (runs on http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — Frontend (runs on http://localhost:5173)
cd frontend && npm run dev
```

### 4. Access the Application

| Interface | URL |
|-----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api/v1 |
| Health Check | http://localhost:4000/api/v1/health |

**Default Admin Credentials:**
- Email: `admin@hirematrix.local`
- Password: `YourSecurePassword123!` (change this in production)

---

## API Reference

### Base URL

```
http://localhost:4000/api/v1
```

### Authentication

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Authenticate user |
| `POST` | `/auth/register` | Register applicant account |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current user |
| `GET/POST` | `/jobs` | List / create jobs |
| `GET/POST` | `/candidates` | List / create candidates |
| `GET/POST` | `/applications` | List / create applications |
| `PATCH` | `/applications/:id/stage` | Move application stage |
| `POST` | `/applications/:id/feedback` | Submit interview feedback |
| `POST` | `/applications/:id/decision` | Record hiring decision |
| `GET/POST` | `/interviews` | List / create interviews |
| `GET` | `/dashboard/metrics` | Get hiring metrics |
| `GET` | `/exports/applications` | Export applications CSV |
| `GET/POST` | `/notifications` | List / create notifications |
| `GET/POST/PATCH` | `/admin/users` | Manage users |

### Pipeline Stages

```
applied → screening → interview → offer → hired
                 ↓          ↓         ↓
              rejected   rejected  rejected
```

---

## Roles & Permissions

| Role | Key | Permissions |
|------|-----|-------------|
| Admin | `admin` | Full system access |
| Recruiter | `recruiter` | Job management, candidate handling, pipeline operations |
| Hiring Manager | `hiring_manager` | Dashboard, application review, hiring decisions |
| Interviewer | `interviewer` | Interview scheduling, feedback submission |
| Applicant | `applicant` | Self-registration, application submission, status tracking |

---

## Project Structure

```
HireMatrix/
├── backend/
│   └── src/
│       ├── config/         # Environment, database, mailer, constants
│       ├── controllers/    # Request handlers (auth, jobs, applications...)
│       ├── middlewares/    # Auth, validation, error handling
│       ├── models/         # Mongoose schemas (13 entities)
│       ├── routes/         # API route definitions
│       ├── services/       # Business logic, external integrations
│       ├── utils/          # JWT, HTTP errors, async helpers
│       ├── app.js          # Express app setup
│       └── server.js       # Entry point
│
├── frontend/
│   └── src/
│       ├── components/     # Reusable UI (AppShell, ui/*)
│       ├── context/        # AuthContext for state management
│       ├── pages/         # Full-page views (Dashboard, Jobs, Pipeline...)
│       ├── utils/         # API helpers, routing utilities
│       ├── App.jsx        # Route definitions
│       └── main.jsx       # React entry point
│
├── report.md               # Detailed project documentation
├── code-walkthrough-script.md  # Code explanation script
└── README.md              # This file
```

---

## License

ISC — See `backend/package.json` for details.