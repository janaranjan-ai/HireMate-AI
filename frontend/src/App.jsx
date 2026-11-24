import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const features = [
  { title: "Resume Analyzer", icon: "📄", desc: "ATS-style score, keyword coverage, sections and actionable feedback." },
  { title: "Job Matcher", icon: "🎯", desc: "Compare your resume against a job description." },
  { title: "Aptitude Practice", icon: "🧠", desc: "Practice quantitative, logical and verbal MCQs." },
  { title: "Coding Practice", icon: "💻", desc: "Practice beginner-friendly programming questions." },
  { title: "Interview Prep", icon: "🎤", desc: "Prepare for technical and HR interview questions." },
  { title: "Placement Dashboard", icon: "📊", desc: "Track completed practice sessions and your progress." }
];

const aptitudeQuestions = [
  { category: "Quantitative", q: "A product costs ₹800 after a 20% discount. What was its original price?", options: ["₹900", "₹960", "₹1,000", "₹1,200"], answer: 2, explanation: "800 ÷ 0.8 = ₹1,000." },
  { category: "Quantitative", q: "A train travels 150 km in 3 hours. Find its average speed.", options: ["40 km/h", "45 km/h", "50 km/h", "60 km/h"], answer: 2, explanation: "Speed = distance ÷ time = 150 ÷ 3 = 50 km/h." },
  { category: "Logical", q: "Find the next number: 2, 6, 12, 20, 30, __", options: ["36", "40", "42", "44"], answer: 2, explanation: "Differences are 4, 6, 8, 10, then 12. The answer is 42." },
  { category: "Logical", q: "If CAT is coded as DBU, how is DOG coded?", options: ["EPH", "EOG", "FPH", "DPI"], answer: 0, explanation: "Each letter moves one position forward: D→E, O→P, G→H." },
  { category: "Verbal", q: "Choose the correctly spelled word.", options: ["Accomodation", "Accommodation", "Acommodation", "Accommadation"], answer: 1, explanation: "Accommodation is spelled with double c and double m." },
  { category: "Verbal", q: "Choose the antonym of 'Expand'.", options: ["Extend", "Increase", "Contract", "Enlarge"], answer: 2, explanation: "Contract means to become smaller; it is the antonym of expand." }
];

const codingQuestions = [
  { language: "Java", title: "Even or Odd", prompt: "Write a program that reads an integer n and prints Even if it is divisible by 2; otherwise print Odd.", sample: "Input: 7\nOutput: Odd", hint: "Use the modulus operator: n % 2." },
  { language: "Python", title: "Sum of Digits", prompt: "Given a positive integer n, calculate and print the sum of its digits.", sample: "Input: 248\nOutput: 14", hint: "Repeatedly use n % 10 to get the last digit, then n // 10." },
  { language: "C", title: "Largest of Three", prompt: "Read three integers and print the largest value.", sample: "Input: 4 9 2\nOutput: 9", hint: "Compare the three values using if/else." },
  { language: "Java", title: "Reverse a String", prompt: "Read a word and print its characters in reverse order.", sample: "Input: hello\nOutput: olleh", hint: "Loop from the last character to the first." }
];

const interviewQuestions = [
  { type: "HR", q: "Tell me about yourself.", answer: "Give a 45–60 second introduction: your degree, relevant skills, one project or internship, strengths, and the role you are targeting. Keep it specific and natural." },
  { type: "HR", q: "Why should we hire you?", answer: "Connect your current skills to the role, support them with one project or learning example, and show that you can learn, collaborate and take responsibility." },
  { type: "HR", q: "What is your greatest strength?", answer: "Choose a real strength such as problem-solving or consistency. Explain it with a short example rather than only naming the quality." },
  { type: "Technical", q: "What is the difference between a list and a tuple in Python?", answer: "A list is mutable, so its elements can be changed. A tuple is immutable after creation. Lists use [] and tuples commonly use ()." },
  { type: "Technical", q: "What is a primary key in DBMS?", answer: "A primary key uniquely identifies each row in a table. It must contain unique, non-NULL values." },
  { type: "Technical", q: "What is overfitting in machine learning?", answer: "Overfitting occurs when a model learns training data too closely, including noise, and performs poorly on unseen data. Regularization, cross-validation and simpler models can help." },
  { type: "Technical", q: "Explain the four pillars of OOP.", answer: "Encapsulation groups data and methods, abstraction hides implementation details, inheritance reuses behavior, and polymorphism allows one interface to have different implementations." },
  { type: "Technical", q: "What is the difference between SQL WHERE and HAVING?", answer: "WHERE filters rows before grouping. HAVING filters groups after GROUP BY and can use aggregate conditions." }
];

function App() {
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [activePage, setActivePage] = useState("Dashboard");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [resultTab, setResultTab] = useState("score");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobMatch, setJobMatch] = useState(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [aptitudeIndex, setAptitudeIndex] = useState(0);
  const [aptitudeChoice, setAptitudeChoice] = useState(null);
  const [aptitudeAnswered, setAptitudeAnswered] = useState(false);
  const [aptitudeScore, setAptitudeScore] = useState(0);
  const [aptitudeDone, setAptitudeDone] = useState(false);
  const [codingIndex, setCodingIndex] = useState(0);
  const [codingNotes, setCodingNotes] = useState("");
  const [interviewFilter, setInterviewFilter] = useState("All");
  const [openedAnswers, setOpenedAnswers] = useState({});
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hiremate_completed") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(() => setApiStatus("Online"))
      .catch(() => setApiStatus("Offline"));
  }, []);

  useEffect(() => {
    localStorage.setItem("hiremate_completed", JSON.stringify(completed));
  }, [completed]);

  const markComplete = (name) => {
    setCompleted((old) => old.includes(name) ? old : [...old, name]);
  };

  const uploadResume = async () => {
    if (!file) { setError("Please choose a PDF resume first."); return; }
    setLoading(true); setError(""); setResult(null); setJobMatch(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${API}/analyze-resume`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Resume analysis failed.");
      setResult(data);
      setResultTab("score");
      markComplete("Resume Analyzer");
    } catch (err) {
      setError(err.message || "Could not connect to the backend. Check that FastAPI is running.");
    } finally { setLoading(false); }
  };

  const runJobMatch = async () => {
    if (!result?.extracted_text) { setError("Analyze a resume first, then use Job Matcher."); return; }
    if (jobDescription.trim().length < 20) { setError("Paste a job description with at least 20 characters."); return; }
    setJobLoading(true); setError(""); setJobMatch(null);
    try {
      const response = await fetch(`${API}/job-match`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: result.extracted_text, job_description: jobDescription })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Job matching failed.");
      setJobMatch(data); markComplete("Job Matcher");
    } catch (err) { setError(err.message || "Job matching failed."); }
    finally { setJobLoading(false); }
  };

  const currentQuestion = aptitudeQuestions[aptitudeIndex];
  const filteredInterview = useMemo(() => interviewQuestions.filter((q) => interviewFilter === "All" || q.type === interviewFilter), [interviewFilter]);

  const chooseAptitude = (index) => {
    if (aptitudeAnswered) return;
    setAptitudeChoice(index); setAptitudeAnswered(true);
    if (index === currentQuestion.answer) setAptitudeScore((score) => score + 1);
  };

  const nextAptitude = () => {
    if (aptitudeIndex === aptitudeQuestions.length - 1) {
      setAptitudeDone(true); markComplete("Aptitude Practice");
    } else {
      setAptitudeIndex((i) => i + 1); setAptitudeChoice(null); setAptitudeAnswered(false);
    }
  };

  const resetAptitude = () => {
    setAptitudeIndex(0); setAptitudeChoice(null); setAptitudeAnswered(false);
    setAptitudeScore(0); setAptitudeDone(false);
  };

  const navigate = (page) => { setActivePage(page); setError(""); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">H</div>
          <div><h2>HireMate <span>AI</span></h2><small>PLACEMENT COMPANION</small></div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          <button className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`} onClick={() => navigate("Dashboard")}><span>⌂</span> Dashboard</button>
          {features.map((f) => <button key={f.title} className={`nav-item ${activePage === f.title ? "active" : ""}`} onClick={() => navigate(f.title)}><span>{f.icon}</span>{f.title}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="api-indicator"><span className={`status-dot ${apiStatus === "Online" ? "online" : ""}`} /><div><strong>Backend {apiStatus}</strong><small>FastAPI connection</small></div></div>
          <p>HIREMATE AI · BUILD 2.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">YOUR CAREER WORKSPACE</span><h1>{activePage}</h1></div>
          <div className="profile"><div className="avatar">J</div><div><strong>Janaranjan K</strong><small>Placement Candidate</small></div></div>
        </header>

        {activePage === "Dashboard" && <>
          <section className="hero">
            <div><span className="hero-tag">✦ YOUR NEXT OPPORTUNITY STARTS HERE</span><h2>Prepare smarter.<br /><span>Get placement-ready.</span></h2><p>Analyze your resume, practice aptitude and coding, and prepare for interviews in one workspace.</p><button className="primary-btn" onClick={() => navigate("Resume Analyzer")}>Analyze My Resume →</button></div>
            <div className="hero-art">✧</div>
          </section>
          <div className="stats-grid">
            <div className="stat-card"><small>MODULES COMPLETED</small><strong>{completed.length} / 5</strong></div>
            <div className="stat-card"><small>APTITUDE BEST SCORE</small><strong>{aptitudeScore} / {aptitudeQuestions.length}</strong></div>
            <div className="stat-card"><small>RESUME SCORE</small><strong>{result ? `${result.score}/100` : "Not analyzed"}</strong></div>
          </div>
          <div className="section-heading"><h2>Placement Toolkit</h2><p>Choose a module to continue your preparation.</p></div>
          <div className="feature-grid">
            {features.map((f) => <button className="feature-card" key={f.title} onClick={() => navigate(f.title)}><div className="feature-icon">{f.icon}</div><h3>{f.title}</h3><p>{f.desc}</p><span className="card-link">{completed.includes(f.title) ? "✓ Completed / Review" : "Open module →"}</span></button>)}
          </div>
        </>}

        {activePage === "Resume Analyzer" && <section className="module-panel">
          <span className="eyebrow">ATS-STYLE RESUME REVIEW</span><h2>Analyze your resume</h2>
          <p>Upload a text-based PDF to review keyword coverage, resume structure, project impact and readability.</p>
          <label className="upload-area"><span className="upload-icon">⇧</span><strong>{file ? file.name : "Choose your resume PDF"}</strong><small>PDF only · Maximum 8 MB · Text-based PDFs</small><input type="file" accept=".pdf,application/pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} /></label>
          <button className="primary-btn" onClick={uploadResume} disabled={loading}>{loading ? "Analyzing..." : "Analyze Resume"}</button>
          {error && <p className="error">{error}</p>}
          {result && <div className="resume-result">
            <div className="result-tabs">{[{id:"score",label:"ATS Score"},{id:"skills",label:"Skills"},{id:"sections",label:"Sections"},{id:"suggestions",label:"Feedback"},{id:"text",label:"Extracted Text"}].map((tab) => <button key={tab.id} className={resultTab === tab.id ? "selected" : ""} onClick={() => setResultTab(tab.id)}>{tab.label}</button>)}</div>
            {resultTab === "score" && <div className="result-section">
              <div className="score-card"><div><span className="eyebrow">ATS-STYLE ESTIMATE</span><h1>{Math.min(99, result.score)}<small>/100</small></h1><p>This score is intentionally capped at 99. It is not an official Google or employer ATS score.</p></div><div className="score-circle">{Math.min(99, result.score)}%</div></div>
              <h3>Score Breakdown</h3>
              {Object.entries(result.score_breakdown || {}).map(([name, value]) => <div className="score-row" key={name}><div className="score-label"><span>{name}</span><strong>{value}</strong></div><div className="progress-track"><div className="progress-fill" style={{width:`${Math.min(100, value / ({ "Relevant Keywords & Skills":25,"Resume Sections":20,"Projects & Impact":15,"Experience":10,"Education":10,"Readability":10,"Contact Details":5,"Document Content":5 }[name] || 100) * 100)}%`}} /></div></div>)}
              <p className="result-note">Heuristic estimate based on visible resume text. Different applicant tracking systems use different parsing and ranking methods.</p>
            </div>}
            {resultTab === "skills" && <div className="result-section"><h3>Detected Skills & Keywords</h3><div className="skill-list">{result.skills?.length ? result.skills.map((s) => <span className="skill-tag" key={s}>✓ {s}</span>) : "No supported skills detected."}</div></div>}
            {resultTab === "sections" && <div className="result-section"><h3>Resume Sections</h3><h4>Detected</h4><div className="skill-list">{result.sections?.map((s) => <span className="skill-tag" key={s}>✓ {s}</span>)}</div><h4>Missing / Not Detected</h4><div className="skill-list">{result.missing_sections?.map((s) => <span className="missing-tag" key={s}>+ {s}</span>)}</div></div>}
            {resultTab === "suggestions" && <div className="result-section"><h3>Strengths</h3><ul>{result.strengths?.map((s,i) => <li key={i}>{s}</li>)}</ul><h3>Improvement Suggestions</h3><ul>{result.suggestions?.map((s,i) => <li key={i}>{s}</li>)}</ul></div>}
            {resultTab === "text" && <div className="result-section"><h3>Extracted Resume Text</h3><pre>{result.extracted_text}</pre></div>}
          </div>}
        </section>}

        {activePage === "Job Matcher" && <section className="module-panel">
          <span className="eyebrow">ROLE COMPATIBILITY</span><h2>Match your resume to a job</h2>
          <p>First analyze your PDF in Resume Analyzer. Then paste the target job description below.</p>
          <textarea className="large-textarea" rows="9" placeholder="Paste the complete job description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          <button className="primary-btn" disabled={jobLoading} onClick={runJobMatch}>{jobLoading ? "Matching..." : "Find My Match"}</button>
          {error && <p className="error">{error}</p>}
          {jobMatch && <div className="result-section job-result"><div className="score-card"><div><span className="eyebrow">KEYWORD MATCH ESTIMATE</span><h1>{jobMatch.match_score}<small>/100</small></h1></div><div className="score-circle">{jobMatch.match_score}%</div></div><h3>Matched Skills</h3><div className="skill-list">{jobMatch.matched_skills.length ? jobMatch.matched_skills.map(s => <span className="skill-tag" key={s}>{s}</span>) : "No listed skills matched."}</div><h3>Skills to Review</h3><div className="skill-list">{jobMatch.missing_skills.length ? jobMatch.missing_skills.map(s => <span className="missing-tag" key={s}>{s}</span>) : "No missing skills from the supported keyword list."}</div><p className="result-note">{jobMatch.message}</p></div>}
        </section>}

        {activePage === "Aptitude Practice" && <section className="module-panel">
          <span className="eyebrow">PRACTICE MCQS</span><h2>Aptitude Training</h2>
          {!aptitudeDone ? <><div className="practice-meta"><span>Question {aptitudeIndex + 1} of {aptitudeQuestions.length}</span><span>{currentQuestion.category}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${((aptitudeIndex+1)/aptitudeQuestions.length)*100}%`}} /></div><div className="question-card"><h3>{currentQuestion.q}</h3><div className="option-list">{currentQuestion.options.map((option,i) => <button key={option} disabled={aptitudeAnswered} className={`option-btn ${aptitudeAnswered && i === currentQuestion.answer ? "correct" : ""} ${aptitudeAnswered && i === aptitudeChoice && i !== currentQuestion.answer ? "incorrect" : ""}`} onClick={() => chooseAptitude(i)}>{String.fromCharCode(65+i)}. {option}</button>)}</div>{aptitudeAnswered && <p className="explanation">{aptitudeChoice === currentQuestion.answer ? "Correct! " : "Not quite. "}{currentQuestion.explanation}</p>}</div>{aptitudeAnswered && <button className="primary-btn" onClick={nextAptitude}>{aptitudeIndex === aptitudeQuestions.length - 1 ? "See Result" : "Next Question →"}</button>}</> : <div className="result-section"><h3>Practice completed</h3><h1>{aptitudeScore} / {aptitudeQuestions.length}</h1><p>You answered {Math.round(aptitudeScore / aptitudeQuestions.length * 100)}% correctly.</p><button className="primary-btn" onClick={resetAptitude}>Practice Again</button></div>}
        </section>}

        {activePage === "Coding Practice" && <section className="module-panel">
          <span className="eyebrow">PROGRAMMING FUNDAMENTALS</span><h2>Coding Practice</h2><div className="practice-meta"><span>Problem {codingIndex + 1} of {codingQuestions.length}</span><span>{codingQuestions[codingIndex].language}</span></div><div className="question-card"><h3>{codingQuestions[codingIndex].title}</h3><p>{codingQuestions[codingIndex].prompt}</p><pre>{codingQuestions[codingIndex].sample}</pre><details><summary>Show hint</summary><p>{codingQuestions[codingIndex].hint}</p></details><label className="field-label">Your solution / approach notes</label><textarea className="large-textarea" rows="6" placeholder="Write your code or explain your approach here..." value={codingNotes} onChange={(e) => setCodingNotes(e.target.value)} /></div><div className="button-row"><button className="secondary-btn" onClick={() => {setCodingIndex((i) => (i + codingQuestions.length - 1) % codingQuestions.length);setCodingNotes("");}}>Previous</button><button className="primary-btn" onClick={() => {markComplete("Coding Practice");setCodingIndex((i) => (i+1)%codingQuestions.length);setCodingNotes("");}}>Save & Next</button></div><p className="result-note">This practice module does not execute code. Use the sample input/output to test your solution in your own compiler.</p>
        </section>}

        {activePage === "Interview Prep" && <section className="module-panel">
          <span className="eyebrow">HR + TECHNICAL PREPARATION</span><h2>Interview Question Bank</h2><div className="filter-row">{["All","HR","Technical"].map(f => <button key={f} className={`filter-btn ${interviewFilter===f?"selected":""}`} onClick={() => setInterviewFilter(f)}>{f}</button>)}</div>{filteredInterview.map((item,index) => <div className="interview-card" key={item.q}><div className="practice-meta"><span>{item.type}</span><span>Question {index+1}</span></div><h3>{item.q}</h3><button className="secondary-btn" onClick={() => setOpenedAnswers(old => ({...old,[item.q]:!old[item.q]}))}>{openedAnswers[item.q] ? "Hide sample answer" : "Reveal sample answer"}</button>{openedAnswers[item.q] && <p className="answer-text">{item.answer}</p>}</div>)}<button className="primary-btn" onClick={() => markComplete("Interview Prep")}>Mark Interview Prep Complete</button>
        </section>}

        {activePage === "Placement Dashboard" && <section className="module-panel">
          <span className="eyebrow">YOUR PREPARATION OVERVIEW</span><h2>Placement Progress</h2><div className="stats-grid"><div className="stat-card"><small>MODULES COMPLETED</small><strong>{completed.length} / 5</strong></div><div className="stat-card"><small>APTITUDE SCORE</small><strong>{aptitudeScore} / {aptitudeQuestions.length}</strong></div><div className="stat-card"><small>RESUME SCORE</small><strong>{result ? `${result.score}/100` : "Pending"}</strong></div></div><h3>Module Checklist</h3><div className="progress-list">{["Resume Analyzer","Job Matcher","Aptitude Practice","Coding Practice","Interview Prep"].map(name => <div className="progress-item" key={name}><span>{name}</span><strong>{completed.includes(name) ? "✓ Completed" : "Not completed"}</strong></div>)}</div><button className="secondary-btn" onClick={() => {setCompleted([]);localStorage.removeItem("hiremate_completed");}}>Reset progress</button><p className="result-note">Progress is saved in this browser on this device. It is not synced to an account or cloud database.</p>
        </section>}

        <footer>Made with care by Janaranjan K · HireMate AI</footer>
      </main>
    </div>
  );
}

export default App;
