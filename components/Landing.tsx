"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

type SimulatedCompany = {
  name: string;
  logo: string;
  logoBg: string;
  rating: "High" | "Medium" | "Low" | "No Opening";
  match: number;
  reason: string;
  skills: string[];
};

export default function Landing() {
  const [profile, setProfile] = useState<"ai" | "web" | "data">("ai");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const simulatedData: Record<"ai" | "web" | "data", SimulatedCompany[]> = {
    ai: [
      {
        name: "OpenAI",
        logo: "O",
        logoBg: "bg-slate-900 text-white",
        rating: "High",
        match: 94,
        reason: "Excellent fit. Requires PyTorch and NLP experience which matches your profile perfectly. 2 active openings in San Francisco.",
        skills: ["PyTorch", "NLP", "LLMs"],
      },
      {
        name: "Google DeepMind",
        logo: "G",
        logoBg: "bg-blue-600 text-white",
        rating: "High",
        match: 91,
        reason: "Highly compatible. Looking for AI Researchers with strong mathematical foundation and Python skills.",
        skills: ["Python", "TensorFlow", "Reinforcement Learning"],
      },
      {
        name: "Stripe",
        logo: "S",
        logoBg: "bg-indigo-600 text-white",
        rating: "Medium",
        match: 78,
        reason: "Good match. Seeking ML Engineers for fraud detection pipelines. Prior fintech experience is a plus.",
        skills: ["Python", "Scikit-Learn", "SQL"],
      },
      {
        name: "Netflix",
        logo: "N",
        logoBg: "bg-red-600 text-white",
        rating: "No Opening",
        match: 0,
        reason: "No active job listings found on their career page matching AI/ML preferences in the last 30 days.",
        skills: [],
      },
    ],
    web: [
      {
        name: "Vercel",
        logo: "▲",
        logoBg: "bg-black text-white",
        rating: "High",
        match: 96,
        reason: "Perfect match! They are looking for Senior Frontend Engineers expert in Next.js and React 19.",
        skills: ["Next.js", "React", "TypeScript"],
      },
      {
        name: "Airbnb",
        logo: "A",
        logoBg: "bg-rose-500 text-white",
        rating: "High",
        match: 88,
        reason: "Great match. Front-end openings require experience in component libraries and micro-frontend architecture.",
        skills: ["React", "CSS Grid", "Tailwind CSS"],
      },
      {
        name: "Stripe",
        logo: "S",
        logoBg: "bg-indigo-600 text-white",
        rating: "Medium",
        match: 75,
        reason: "Moderate fit. UI engineer role open. Requires strong JS fundamentals and dashboard layout experience.",
        skills: ["JavaScript", "React", "TypeScript"],
      },
      {
        name: "Meta",
        logo: "M",
        logoBg: "bg-blue-500 text-white",
        rating: "Low",
        match: 45,
        reason: "Weak fit. Active openings are mostly focused on low-level systems engineering (C++) rather than web frontend.",
        skills: ["React"],
      },
    ],
    data: [
      {
        name: "Snowflake",
        logo: "❄",
        logoBg: "bg-sky-400 text-white",
        rating: "High",
        match: 92,
        reason: "Outstanding match. Looking for Data Analysts expert in SQL, Snowflake, and Python dashboards.",
        skills: ["SQL", "Snowflake", "Python"],
      },
      {
        name: "Amazon",
        logo: "a",
        logoBg: "bg-orange-500 text-white",
        rating: "High",
        match: 89,
        reason: "Strong compatibility. Operations Data Analyst role open. Strong SQL and AWS ecosystem knowledge required.",
        skills: ["SQL", "AWS", "Tableau"],
      },
      {
        name: "Uber",
        logo: "U",
        logoBg: "bg-black text-white",
        rating: "Medium",
        match: 81,
        reason: "Good match. Team is hiring for marketplace analytics. Heavy focus on Python automation and stats models.",
        skills: ["Python", "R", "SQL"],
      },
      {
        name: "Google",
        logo: "G",
        logoBg: "bg-blue-600 text-white",
        rating: "No Opening",
        match: 0,
        reason: "No active openings found matching Data Analyst parameters in the requested location (Bangalore).",
        skills: [],
      },
    ],
  };

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setShowResults(false);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setShowResults(true);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const ratingStyles = {
    High: "bg-emerald-accent/15 text-emerald-accent border border-emerald-accent/20",
    Medium: "bg-yellow-accent/15 text-yellow-accent border border-yellow-accent/20",
    Low: "bg-ruby-accent/15 text-ruby-accent border border-ruby-accent/20",
    "No Opening": "bg-slate-400/10 text-text-muted border border-card-border",
  };

  return (
    <div className="space-y-20 py-10 grid-bg min-h-screen relative">
      <div className="absolute inset-0 radial-glow pointer-events-none" />

      {/* Hero Header */}
      <div className="text-center relative max-w-4xl mx-auto px-4 pt-10">
        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs font-semibold px-4 py-1.5 rounded-full mb-6 hover:bg-accent/15 transition-all">
          <span>Built for modern job seekers in India 🇮🇳</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
          Stop checking 100 career pages.
          <span className="block mt-2 bg-gradient-to-r from-accent to-purple-accent bg-clip-text text-transparent">
            Let AI scan them daily.
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your target companies list, set your resume, and let our AI scanner automatically monitor their career boards. Get matched alerts sent straight to your inbox.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => signIn("google")}
            className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.444-2.889-6.444-6.444s2.889-6.444 6.444-6.444c1.607 0 3.078.584 4.222 1.548l3.12-3.12C19.123 2.016 15.86 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.897 0 10.868-4.058 11.96-9.6H12.24z"/>
            </svg>
            Get Started Free with Google
          </button>
        </div>
        <p className="text-xs text-text-muted mt-4">Free plan includes 10 companies daily • No credit card required</p>
      </div>

      {/* Interactive AI Match Simulator */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="glass-panel rounded-2xl shadow-xl border border-card-border p-6 sm:p-8 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-card-border pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Interactive AI Match Simulator</h2>
              <p className="text-sm text-text-muted mt-1">See how the AI parses careers and ranks jobs in real-time</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "ai", label: "AI/ML Engineer" },
                { id: "web", label: "React Developer" },
                { id: "data", label: "Data Analyst" }
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setProfile(t.id);
                    setShowResults(false);
                    setScanProgress(0);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    profile === t.id
                      ? "bg-accent text-white shadow-md shadow-accent/20"
                      : "bg-card hover:bg-accent/10 border border-card-border text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Simulator Control */}
            <div className="md:col-span-5 space-y-5">
              <div className="bg-background rounded-xl p-5 border border-card-border space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Simulated Profile</span>
                  <span className="text-xs bg-accent-light text-accent font-semibold px-2 py-0.5 rounded-full">
                    {profile === "ai" ? "AI Specialist" : profile === "web" ? "UI Specialist" : "Analytics Specialist"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-text-muted">Target Skills:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile === "ai" && ["Python", "PyTorch", "NLP", "TensorFlow", "LLMs"].map(s => (
                      <span key={s} className="bg-card border border-card-border px-2.5 py-1 rounded-md text-xs text-foreground">{s}</span>
                    ))}
                    {profile === "web" && ["React", "TypeScript", "Next.js", "Tailwind CSS", "JavaScript"].map(s => (
                      <span key={s} className="bg-card border border-card-border px-2.5 py-1 rounded-md text-xs text-foreground">{s}</span>
                    ))}
                    {profile === "data" && ["SQL", "Python", "Tableau", "Snowflake", "AWS"].map(s => (
                      <span key={s} className="bg-card border border-card-border px-2.5 py-1 rounded-md text-xs text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-text-muted">Experience Level:</div>
                  <div className="text-sm font-semibold text-foreground">1-3 Years</div>
                </div>
              </div>

              <button
                onClick={handleSimulatedScan}
                disabled={isScanning}
                className="w-full bg-accent hover:bg-accent-hover disabled:bg-accent/40 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scanning Career Pages ({scanProgress}%)
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Simulate AI Career Scan
                  </>
                )}
              </button>
            </div>

            {/* Simulator Results */}
            <div className="md:col-span-7 h-96 flex flex-col bg-background rounded-xl border border-card-border overflow-hidden relative">
              {!isScanning && !showResults && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <div className="w-16 h-16 bg-accent-light text-accent rounded-full flex items-center justify-center text-3xl">🔍</div>
                  <div className="font-bold text-lg text-foreground">Awaiting Scan trigger</div>
                  <p className="text-sm text-text-muted max-w-sm">Click the button to simulate scanning OpenAI, DeepMind, Stripe, and Vercel career pages.</p>
                </div>
              )}

              {isScanning && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-4 border-accent animate-radar" />
                    <div className="absolute inset-4 bg-accent-light rounded-full flex items-center justify-center text-2xl font-bold text-accent">AI</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">AI Agent Reading Career Boards...</div>
                    <div className="text-xs text-text-muted mt-1">Downloading DOM models & matching keywords</div>
                  </div>
                  <div className="w-64 bg-card border border-card-border h-2.5 rounded-full overflow-hidden">
                    <div className="bg-accent h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}

              {showResults && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between border-b border-card-border pb-2.5 mb-2">
                    <div className="text-xs font-bold uppercase text-text-muted">Company</div>
                    <div className="text-xs font-bold uppercase text-text-muted text-right">Match % / Rating</div>
                  </div>

                  {simulatedData[profile].map((company) => (
                    <div key={company.name} className="bg-card hover:border-accent border border-card-border rounded-xl p-3.5 transition-all shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${company.logoBg}`}>
                            {company.logo}
                          </div>
                          <div>
                            <div className="font-bold text-foreground text-sm">{company.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">Career Board active</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {company.rating === "No Opening" ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">No Opening</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-foreground">{company.match}% Match</span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ratingStyles[company.rating]}`}>
                                {company.rating}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {company.rating !== "No Opening" && (
                        <div className="mt-3 text-xs text-text-muted leading-relaxed border-t border-card-border/50 pt-2">
                          <span className="font-bold text-foreground">AI Reason: </span>{company.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-extrabold text-foreground text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Import Company List",
              desc: "Provide a public Google Sheet containing company names and their career page links. We handle the web routing.",
              icon: (
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              step: "2",
              title: "Set Match Preferences",
              desc: "Upload your resume and provide details on roles, location, expected salary range, and target skills.",
              icon: (
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
            {
              step: "3",
              title: "Analyze & Tracker Board",
              desc: "The AI agent scans daily, generating Match %, Star Ratings, and reasoning. Maintain applications on the dashboard.",
              icon: (
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.step} className="bg-card border border-card-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative">
              <div className="absolute -top-4 -left-4 w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shadow-md">
                {s.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5">
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-extrabold text-foreground text-center mb-12">Everything you need to hunt smarter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Resume-based matching",
              desc: "AI extracts your core skills from your PDF resume and rates fit against live listings.",
              icon: "📄",
            },
            {
              title: "Daily auto-scans",
              desc: "Set and forget. Runs in the background every morning to look for newly posted listings.",
              icon: "⏰",
            },
            {
              title: "Instant email alerts",
              desc: "Get emails highlighting high-percentage matches so you can apply ahead of the crowd.",
              icon: "📧",
            },
            {
              title: "Google Sheet sync",
              desc: "Automatically write scan results (Ratings, Status) back to your tracking spreadsheet.",
              icon: "📊",
            },
            {
              title: "Application CRM Tracker",
              desc: "Manage job listings through custom status categories (Applied, Interviewing, Offered).",
              icon: "📝",
            },
            {
              title: "CSV Export",
              desc: "Export matching data to spreadsheets to share with mentors or aggregate in your files.",
              icon: "⬇️",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card border border-card-border rounded-xl p-5 hover:border-accent transition-all shadow-sm">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-foreground text-base mb-1.5">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Pricing & Final CTA */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-br from-accent/90 to-purple-accent/90 rounded-2xl p-8 sm:p-12 text-center text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-15" />
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 relative">Ready to automate your search?</h2>
          <p className="text-indigo-100 max-w-xl mx-auto mb-8 text-base sm:text-lg relative">
            Join thousands of applicants who let AI agents review companies daily. Start scanning for free, or upgrade to scan 100s of boards instantly.
          </p>
          <div className="relative inline-block">
            <button
              onClick={() => signIn("google")}
              className="bg-white text-accent hover:bg-slate-50 hover:scale-105 active:scale-95 font-bold px-10 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              Sign In with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

