<div align="center">

<img src="https://img.shields.io/badge/AI-Hiring%20Assistant-6366f1?style=for-the-badge&logo=robot&logoColor=white" alt="AI Hiring Assistant" />

# 🤖 AI Hiring Assistant

### *Hire smarter. Faster. Automatically.*

A full-stack AI-powered hiring platform that **parses resumes**, **scores candidates**, **shortlists top matches**, and **sends personalized emails** — all in seconds.

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=flat-square&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<br/>

![AI Hiring Assistant Banner](https://placehold.co/900x400/6366f1/ffffff?text=AI+Hiring+Assistant&font=montserrat)

</div>

---

## 🌟 Overview

The **AI Hiring Assistant** eliminates the manual effort of resume screening. Upload resumes, define a job description, and let AI handle the rest — parsing, scoring, ranking, shortlisting, and even sending personalized interview or rejection emails — all from one unified dashboard.

> Built for recruiters who value speed, accuracy, and scale.

---

## ✨ Key Features

### 📄 Resume Processing
- Upload **PDF** and **Word (.docx)** resumes in bulk
- Automatic text extraction and parsing via `pdf-parse` & `mammoth`
- Structured candidate profiles: skills, experience, education

### 🧠 AI Candidate Scoring
- Matches every resume against your **Job Description**
- Smart weighted scoring model:

  | Criterion      | Weight |
  |----------------|--------|
  | 🛠️ Skills       | 50%    |
  | 💼 Experience   | 30%    |
  | 🎓 Education    | 10%    |
  | 🎯 Overall Fit  | 10%    |

### ✅ Auto Shortlisting
- Candidates scoring **≥ threshold** are automatically shortlisted
- Ranked leaderboard with top candidates highlighted

### 📧 Email Automation
- AI-generated, personalized emails:
  - 🟢 **Interview Invite**
  - 🔴 **Rejection Notice**
- Sent via SMTP (Gmail, SendGrid, AWS SES, etc.)
- Full **email history** tracked per candidate

### ⚡ Batch Processing
- Upload **multiple resumes** at once
- Full pipeline: **Parse → Score → Shortlist → Email** (optional auto mode)

### 🎛️ Recruiter Control
- Manual or automatic email dispatch
- **Editable drafts** before sending
- Real-time dashboard with candidate insights

---

## 🚀 Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| **Frontend**   | React.js, Tailwind CSS                          |
| **Backend**    | Node.js, Express.js                             |
| **File Upload**| Multer                                          |
| **Resume Parsing** | pdf-parse, mammoth (.docx)                 |
| **AI / LLM**   | OpenAI · Claude (Anthropic) · Gemini · GLM      |
| **Storage**    | AWS S3 / Local Storage                          |
| **Email**      | Nodemailer (SMTP)                               |

---

## 🧩 Project Structure

```
ai-hiring-assistant/
│
├── backend/                  # Express API server
│   ├── controllers/          # Route handlers
│   ├── services/
│   │   ├── llm/              # OpenAI, Claude, Gemini, GLM adapters
│   │   ├── parser/           # PDF & DOCX resume parsers
│   │   ├── storage/          # AWS S3 / Local storage handlers
│   │   └── email/            # Nodemailer email service
│   ├── routes/               # API route definitions
│   ├── middleware/           # Auth, error handling, upload (Multer)
│   ├── .env.example
│   └── server.js
│
├── frontend/                 # React + Tailwind UI
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Dashboard, Candidates, Settings
│   │   └── App.jsx
│   └── index.html
│
└── README.md
```

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm or yarn
- An API key for at least one LLM provider (OpenAI, Gemini, Claude, or GLM)
- SMTP credentials (e.g. Gmail App Password)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sandeshj458/AI-Hiring-Assistant.git
cd AI-Hiring-Assistant

# 2. Setup & run backend
cd backend
cp .env.example .env       # Fill in your keys (see below)
npm install
npm run dev

# 3. Setup & run frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

The app will be available at **`http://localhost:5173`** (frontend) and **`http://localhost:3000`** (API).

---

## ⚙️ Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# ── Server ──────────────────────────────────────────
PORT=3000

# ── LLM Provider ────────────────────────────────────
# Options: openai | anthropic | gemini | glm
LLM_PROVIDER=gemini

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GLM_API_KEY=

# ── Storage ──────────────────────────────────────────
# Options: local | s3
STORAGE_BACKEND=local

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET=

# ── SMTP Email ───────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="Hiring Team <your_email@gmail.com>"
```

> 💡 **Tip:** For Gmail, generate an [App Password](https://support.google.com/accounts/answer/185833) instead of using your account password.

---

## 🌐 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                     Recruiter Dashboard                  │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  1. Add Job Description        │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  2. Upload Resumes (PDF/DOCX)  │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  3. AI Parses & Scores         │
         │     ├─ Extract candidate data  │
         │     ├─ Score against JD        │
         │     └─ Rank & shortlist        │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │  4. Send Emails     │
         │     ├─ Interview Invites       │
         │     └─ Rejection Notices       │
         └────────────────────────────────┘
```

---

## 📡 API Reference

| Method | Endpoint               | Description                        |
|--------|------------------------|------------------------------------|
| `POST` | `/api/upload-resume`   | Upload a resume file               |
| `POST` | `/api/parse-resume`    | Extract structured data from resume|
| `POST` | `/api/score-candidate` | Score a candidate against a JD     |
| `GET`  | `/api/candidates`      | Retrieve all candidates            |
| `GET`  | `/api/shortlisted`     | Retrieve shortlisted candidates    |
| `POST` | `/api/generate-email`  | AI-generate an email draft         |
| `POST` | `/api/send-email`      | Send email to a candidate          |
| `POST` | `/api/batch-process`   | Run full pipeline on all resumes   |

> 📖 Full API documentation with request/response schemas is available in [`/docs`](docs/).

---

## 📊 Dashboard Features

| Metric | Description |
|--------|-------------|
| 📈 **Total Candidates** | Count of all uploaded resumes |
| 🟢 **Shortlisted** | Candidates above score threshold |
| 📊 **Average Score** | Mean AI score across all candidates |
| 🏆 **Top Candidate** | Highest scoring applicant |

---

## 🔐 Security

- All API keys stored securely in `.env` (never committed to version control)
- Secure SMTP authentication via App Passwords or OAuth
- AWS S3 access controlled via **IAM policies** (when using S3)
- `.gitignore` pre-configured to exclude sensitive files

---
<div align="center">

</div>
