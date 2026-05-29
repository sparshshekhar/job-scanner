"use client";
import { useState } from "react";


export type Preferences = {
  jobType: string;
  experience: string;
  skills: string;
  location: string;
};

export type CompanyResult = {
  company: string;
  url: string;
  rating: "High" | "Medium" | "Low" | "No Opening" | "Pending" | "";
  reason: string;
};

export default function Home() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [preferences, setPreferences] = useState<Preferences>({
    jobType: "AI/ML",
    experience: "0-1 years",
    skills: "",
    location: "",
  });
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [resumeText, setResumeText] = useState("");
const [resumeUploading, setResumeUploading] = useState(false);

  const ratingColor: Record<string, string> = {
    High: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-orange-100 text-orange-800",
    "No Opening": "bg-red-100 text-red-800",
    Pending: "bg-gray-100 text-gray-500",
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setResumeUploading(true);
  const formData = new FormData();
  formData.append("resume", file);
  const res = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  setResumeText(data.text);
  setResumeUploading(false);
};

  const handleScan = async () => {
    if (!sheetUrl) return alert("Please enter a Google Sheet URL");
    setLoading(true);
    setResults([]);

    // Step 1: Read the sheet
    const sheetRes = await fetch("/api/read-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl }),
    });
    const { companies } = await sheetRes.json();
    if (!companies?.length) {
      alert("No companies found in sheet. Check the URL and sheet is public.");
      setLoading(false);
      return;
    }

    // Step 2: Initialize results as Pending
    const initial: CompanyResult[] = companies.map((c: any) => ({
      company: c.name,
      url: c.url,
      rating: "Pending",
      reason: "Scanning...",
    }));
    setResults(initial);
    setProgress({ current: 0, total: companies.length });

    // Step 3: Scan each company one by one
    const final = [...initial];
    for (let i = 0; i < companies.length; i++) {
      const res = await fetch("/api/scan-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companies[i], preferences, resumeText }),
      });
      const data = await res.json();
      final[i] = { ...final[i], rating: data.rating, reason: data.reason };
      setResults([...final]);
      setProgress({ current: i + 1, total: companies.length });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setLoading(false);
  };

  const exportCSV = () => {
    const rows = [
      ["Company", "URL", "Rating", "Reason"],
      ...results.map((r) => [r.company, r.url, r.rating, r.reason]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-results.csv";
    a.click();
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🔍 Job Scanner
        </h1>
        <p className="text-gray-500 mb-8">
          Scan company career pages and rate job matches automatically.
        </p>

        {/* Sheet URL */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">📄 Google Sheet URL</h2>
          <p className="text-sm text-gray-400 mb-2">
            Sheet must be public. Expected columns: <code>Company Name</code>,{" "}
            <code>Career Page URL</code>
          </p>
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
          />
        </div>

        {/* Resume Upload */}
<div className="bg-white rounded-2xl shadow p-6 mb-6">
  <h2 className="text-lg font-semibold mb-2">📄 Upload Resume <span className="text-sm text-gray-400 font-normal">(optional but recommended)</span></h2>
  <p className="text-sm text-gray-400 mb-3">AI will match jobs based on your actual resume</p>
  <input
    type="file"
    accept=".pdf"
    onChange={handleResumeUpload}
    className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
  />
  {resumeUploading && <p className="text-sm text-blue-500 mt-2">Extracting resume...</p>}
  {resumeText && !resumeUploading && <p className="text-sm text-green-600 mt-2">✅ Resume loaded successfully!</p>}
</div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">⚙️ Your Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Job Type
              </label>
              <select
                value={preferences.jobType}
                onChange={(e) =>
                  setPreferences({ ...preferences, jobType: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
              >
                <option>AI/ML</option>
                <option>Full Stack</option>
                <option>Frontend</option>
                <option>Backend</option>
                <option>Data Science</option>
                <option>DevOps</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Experience
              </label>
              <select
                value={preferences.experience}
                onChange={(e) =>
                  setPreferences({ ...preferences, experience: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
              >
                <option>0-1 years</option>
                <option>1-3 years</option>
                <option>3-5 years</option>
                <option>5+ years</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Skills (comma separated)
              </label>
              <input
                type="text"
                placeholder="Python, TensorFlow, React..."
                value={preferences.skills}
                onChange={(e) =>
                  setPreferences({ ...preferences, skills: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Location (optional)
              </label>
              <input
                type="text"
                placeholder="Remote, Bangalore, etc."
                value={preferences.location}
                onChange={(e) =>
                  setPreferences({ ...preferences, location: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
              />
            </div>
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl mb-8 transition"
        >
          {loading
            ? `Scanning... (${progress.current}/${progress.total})`
            : "🚀 Start Scanning"}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">📊 Results</h2>
              <button
                onClick={exportCSV}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg"
              >
                ⬇️ Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Rating</th>
                  <th className="pb-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3">
                      <a
                        href={r.url}
                        target="_blank"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {r.company}
                      </a>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${ratingColor[r.rating] || ""}`}
                      >
                        {r.rating}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
