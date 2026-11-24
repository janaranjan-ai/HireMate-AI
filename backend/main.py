from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import fitz
import re
from collections import Counter

app = FastAPI(
    title="HireMate AI",
    description="Placement preparation and ATS-style resume analysis platform",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://hire-mate-5sfvwtcxt-janaranjan-ks-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SKILLS = [
    "python", "java", "c++", "c", "sql", "html", "css", "javascript",
    "react", "node.js", "machine learning", "deep learning", "data analysis",
    "pandas", "numpy", "power bi", "excel", "tensorflow", "keras",
    "scikit-learn", "fastapi", "flask", "mongodb", "mysql", "git",
    "github", "statistics", " tableau", "communication", " problem solving",
    "data visualization", "natural language processing", "nlp", "aws",
    "docker", "linux", "rest api", "postgresql", "bootstrap"
]

SECTION_TERMS = {
    "Education": ["education", "academic", "qualification"],
    "Projects": ["projects", "project"],
    "Experience": ["experience", "internship", "work history"],
    "Certifications": ["certifications", "certificates", "courses"],
    "Skills": ["skills", "technical skills", "core competencies"],
    "Summary / Objective": ["summary", "objective", "profile"]
}

ACTION_WORDS = [
    "built", "developed", "created", "designed", "implemented", "analyzed",
    "improved", "automated", "optimized", "led", "managed", "deployed",
    "achieved", "reduced", "increased", "trained", "engineered"
]

def has_any(text, terms):
    return any(term in text for term in terms)

def calculate_ats_score(text, found_skills, found_sections):
    """
    Transparent ATS-style heuristic. It is not Google's formula or a vendor ATS score.
    The hard cap of 99 guarantees the displayed score can never be 100.
    """
    lower = text.lower()
    words = re.findall(r"\b[\w+#.-]+\b", lower)
    word_count = len(words)

    # 25 points: breadth of relevant technical keywords
    skill_points = min(25, round(len(found_skills) * 1.25))

    # 20 points: standard resume sections
    section_points = min(20, round((len(found_sections) / len(SECTION_TERMS)) * 20))

    # 15 points: project detail and evidence of impact
    project_present = "Projects" in found_sections
    action_count = sum(1 for word in ACTION_WORDS if re.search(r"\b" + re.escape(word) + r"\b", lower))
    metric_present = bool(re.search(r"\b\d+(\.\d+)?\s*(%|percent|users|records|seconds|minutes|hours|days|months|years)?\b", lower))
    project_points = (7 if project_present else 0) + min(5, action_count) + (3 if metric_present else 0)

    # 10 points: experience / practical exposure
    experience_points = 10 if "Experience" in found_sections else (4 if has_any(lower, ["internship", "training", "workshop"]) else 0)

    # 10 points: education and relevant qualification details
    education_points = 10 if "Education" in found_sections else 0

    # 10 points: readability proxy; avoid rewarding excessive length
    readability_points = 0
    if 250 <= word_count <= 900:
        readability_points = 10
    elif 150 <= word_count < 250 or 901 <= word_count <= 1200:
        readability_points = 7
    elif 80 <= word_count < 150 or 1200 < word_count <= 1600:
        readability_points = 4

    # 5 points: contact details
    email_present = bool(re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text))
    phone_present = bool(re.search(r"(\+?\d[\d\s().-]{7,}\d)", text))
    contact_points = (3 if email_present else 0) + (2 if phone_present else 0)

    # 5 points: PDF text extraction / basic document quality proxy
    quality_points = 5 if word_count >= 100 and len(text.strip()) > 600 else (2 if word_count >= 50 else 0)

    breakdown = {
        "Relevant Keywords & Skills": skill_points,
        "Resume Sections": section_points,
        "Projects & Impact": min(project_points, 15),
        "Experience": experience_points,
        "Education": education_points,
        "Readability": readability_points,
        "Contact Details": contact_points,
        "Document Content": quality_points
    }

    raw_score = sum(breakdown.values())
    score = min(99, max(0, raw_score))  # Never return 100.
    suggestions = []

    if skill_points < 18:
        suggestions.append("Add job-relevant technical skills that you can confidently demonstrate.")
    if section_points < 18:
        missing = [name for name in SECTION_TERMS if name not in found_sections]
        suggestions.append("Consider adding or clearly labeling: " + ", ".join(missing) + ".")
    if project_points < 12:
        suggestions.append("Strengthen project descriptions with action verbs, technologies, and measurable outcomes.")
    if experience_points < 8:
        suggestions.append("Include internships, workshops, volunteering, or practical experience where relevant.")
    if readability_points < 8:
        suggestions.append("Keep the resume concise, structured, and easy to scan; aim for roughly 250–900 extracted words.")
    if not email_present or not phone_present:
        suggestions.append("Make sure your email address and phone number are clearly visible.")
    if not suggestions:
        suggestions.append("Review the target job description and tailor relevant skills and achievements before applying.")

    return score, breakdown, suggestions

@app.get("/")
def home():
    return {"message": "HireMate AI API is running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy", "project": "HireMate AI"}

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF is too large. Maximum size is 8 MB.")
    try:
        with fitz.open(stream=content, filetype="pdf") as document:
            extracted_text = "\n".join(page.get_text("text") for page in document)
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read this PDF. Please try another PDF.")
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No selectable text found. Scanned/image-only PDFs are not supported yet.")

    lower = extracted_text.lower()
    found_skills = [s.strip() for s in SKILLS if re.search(r"(?<![a-z0-9])" + re.escape(s.strip()) + r"(?![a-z0-9])", lower)]
    found_sections = [
        section for section, terms in SECTION_TERMS.items()
        if any(re.search(r"\b" + re.escape(term) + r"\b", lower) for term in terms)
    ]
    missing_sections = [section for section in SECTION_TERMS if section not in found_sections]
    score, score_breakdown, suggestions = calculate_ats_score(extracted_text, found_skills, found_sections)

    strengths = []
    if found_skills:
        strengths.append(f"Detected {len(found_skills)} relevant skills or keywords.")
    if "Projects" in found_sections:
        strengths.append("A projects section is present.")
    if "Education" in found_sections:
        strengths.append("An education section is present.")
    if "Experience" in found_sections:
        strengths.append("Experience or internship information is present.")
    if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", extracted_text):
        strengths.append("An email address was detected.")
    if not strengths:
        strengths.append("The PDF contains extractable text that can be reviewed.")

    return {
        "filename": file.filename,
        "score": score,
        "score_breakdown": score_breakdown,
        "skills": found_skills,
        "sections": found_sections,
        "missing_sections": missing_sections,
        "strengths": strengths,
        "suggestions": suggestions,
        "extracted_text": extracted_text,
        "word_count": len(re.findall(r"\b\w+\b", extracted_text)),
        "message": "ATS-style resume review completed. Score is capped at 99."
    }

class JobMatchRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/job-match")
def job_match(payload: JobMatchRequest):
    resume = payload.resume_text.strip().lower()
    job = payload.job_description.strip().lower()
    if len(resume) < 20 or len(job) < 20:
        raise HTTPException(status_code=400, detail="Provide both resume text and a meaningful job description.")

    terms = [s.strip() for s in SKILLS]
    required = [term for term in terms if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", job)]
    matched = [term for term in required if re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", resume)]
    missing = [term for term in required if term not in matched]
    if required:
        match_score = min(99, round((len(matched) / len(required)) * 100))
    else:
        job_words = set(re.findall(r"\b[a-z][a-z0-9+#.-]{3,}\b", job))
        resume_words = set(re.findall(r"\b[a-z][a-z0-9+#.-]{3,}\b", resume))
        ignored = {"with", "this", "that", "from", "will", "your", "have", "work", "role", "team", "years", "year", "good"}
        job_words -= ignored
        match_score = min(99, round(len(job_words & resume_words) / max(1, len(job_words)) * 100))
    return {
        "match_score": match_score,
        "required_skills": required,
        "matched_skills": matched,
        "missing_skills": missing,
        "message": "Keyword overlap estimate only. Review the full role requirements before applying."
    }
