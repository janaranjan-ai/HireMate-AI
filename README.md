# HireMate AI — Placement Preparation Platform

## Included modules
- Resume Analyzer: PDF text extraction, transparent ATS-style heuristic score, skills, section checks and suggestions.
- Job Matcher: compares resume text against a pasted job description using a supported skill/keyword list.
- Aptitude Practice: quantitative, logical and verbal multiple-choice practice.
- Coding Practice: Java, Python and C practice prompts with examples and hints. It does **not** execute code.
- Interview Prep: HR and technical question bank with sample answers.
- Placement Dashboard: browser-local completion tracking.

## Important ATS score note
The resume score is an independent heuristic estimate, **not Google's scoring formula**, not an official Google ATS score, and not a guarantee of passing any employer's applicant tracking system. ATS products differ. The backend enforces a hard maximum of **99**, so the score cannot reach 100.

The score uses:
- Relevant keywords and skills: 25
- Resume sections: 20
- Projects and impact: 15
- Experience: 10
- Education: 10
- Readability proxy: 10
- Contact details: 5
- Extractable document content: 5

The score is capped at 99 even if the raw rubric sum reaches 100.

## Requirements
- Python 3.10+
- Node.js 20.19+ or 22.12+ recommended for current Vite
- Text-based PDF resume (image-only/scanned PDFs are not OCR processed)

## Run backend (Windows PowerShell)
```powershell
cd HireMate-AI\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
Backend: http://127.0.0.1:8000  
API docs: http://127.0.0.1:8000/docs

## Run frontend (second terminal)
```powershell
cd HireMate-AI\frontend
npm install
npm run dev
```
Open the local URL shown by Vite (usually http://localhost:5173).

## Notes
- Both backend and frontend terminals must remain open.
- Job Matcher requires a resume to be analyzed first.
- Dashboard progress is stored in localStorage in the current browser only.
- Coding Practice is a prompt-and-notes module; it does not compile or run code.
- This project does not connect to Google, an employer ATS, or external job databases.

**HireMate AI – Placement Preparation Platform**

- Developed a web-based placement preparation platform using React, Vite, Python, and FastAPI.
- Implemented PDF resume text extraction and heuristic ATS-style scoring with skill detection and improvement suggestions.
- Built a job description matching module to identify matched and missing skills.
- Deployed the frontend on Vercel and backend on Render.

**Live Demo:** https://hire-mate-5sfvwtcxt-janaranjan-ks-projects.vercel.app

**GitHub:** https://github.com/janaranjan-ai/HireMate-AI
