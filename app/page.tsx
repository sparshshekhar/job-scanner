"use client";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

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
  status:
    | "Not Applied"
    | "Applied"
    | "Interviewing"
    | "Offered"
    | "Rejected"
    | "";
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
  const [email, setEmail] = useState("");
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  const [filterRating, setFilterRating] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const { data: session } = useSession();

  const ratingColor: Record<string, string> = {
    High: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-orange-100 text-orange-800",
    "No Opening": "bg-red-100 text-red-800",
    Pending: "bg-gray-100 text-gray-500",
  };

  const statusColor: Record<string, string> = {
    "Not Applied": "bg-gray-100 text-gray-600",
    Applied: "bg-blue-100 text-blue-700",
    Interviewing: "bg-purple-100 text-purple-700",
    Offered: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  useEffect(() => {
    if (!session?.user?.email) return;

    const loadResults = async () => {
      try {
        const configRes = await fetch("/api/get-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user!.email }),
        });
        const { config } = await configRes.json();
        if (config?.sheetUrl) setSheetUrl(config.sheetUrl);
        if (config?.preferences) setPreferences(config.preferences);
        if (config?.email) setEmail(config.email);
      } catch (err) {
        console.error("Load error:", err);
      }
    };

    loadResults();
  }, [session?.user?.email]);

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

  const saveConfig = async () => {
    if (!email) return alert("Please enter your email first");
    const res = await fetch("/api/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl, preferences, resumeText, email }),
    });
    if (res.ok) {
      setAutoScanEnabled(true);
      alert("✅ Daily auto-scan enabled!");
    }
  };

  const writeToSheet = async () => {
    if (!results.length) return alert("No results to write!");
    const res = await fetch("/api/write-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl, results }),
    });
    if (res.ok) alert("✅ Results written to Google Sheet!");
    else alert("❌ Failed to write to sheet");
  };

  const updateStatus = async (
    index: number,
    status: CompanyResult["status"],
  ) => {
    const updated = [...results];
    updated[index] = { ...updated[index], status };
    setResults(updated);

    if (session?.user?.email) {
      await fetch("/api/save-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          company: results[index].company,
          status,
        }),
      });
    }
  };

  const handleScan = async () => {
    if (!sheetUrl) return alert("Please enter a Google Sheet URL");
    setLoading(true);
    setResults([]);

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

    const initial: CompanyResult[] = companies.map((c: any) => ({
      company: c.name,
      url: c.url,
      rating: "Pending",
      reason: "Scanning...",
      status: "Not Applied",
    }));
    setResults(initial);
    setProgress({ current: 0, total: companies.length });

    // Load saved statuses BEFORE scanning starts
    let statuses: Record<string, CompanyResult["status"]> = {};
    if (session?.user?.email) {
      const statusRes = await fetch("/api/get-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      });
      const data = await statusRes.json();
      statuses = data.statuses || {};
    }

    const final = [...initial];
    for (let i = 0; i < companies.length; i++) {
      const res = await fetch("/api/scan-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companies[i],
          preferences,
          resumeText,
        }),
      });
      const data = await res.json();
      final[i] = {
        ...final[i],
        rating: data.rating,
        reason: data.reason,
        status: statuses[companies[i].name] || "Not Applied",
      };
      setResults([...final]);
      setProgress({ current: i + 1, total: companies.length });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (session?.user?.email) {
      await fetch("/api/save-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email, results: final }),
      });

      await fetch("/api/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl,
          preferences,
          resumeText,
          email: session.user.email,
        }),
      });
    }

    setLoading(false);
  };

  const exportCSV = () => {
    const rows = [
      ["Company", "URL", "Rating", "Reason", "Status"],
      ...results.map((r) => [
        r.company,
        r.url,
        r.rating,
        r.reason,
        r.status || "Not Applied",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-results.csv";
    a.click();
  };

  const filteredResults = results
    .filter((r) => (filterRating === "All" ? true : r.rating === filterRating))
    .sort((a, b) => {
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "rating") {
        const order = ["High", "Medium", "Low", "No Opening", "Pending"];
        return order.indexOf(a.rating) - order.indexOf(b.rating);
      }
      return 0;
    });

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🔍 Job Scanner</h1>
            <p className="text-gray-500">
              Scan company career pages and rate job matches automatically.
            </p>
          </div>
          <div className="w-full sm:w-auto">
            {session ? (
              <div className="flex items-center gap-3">
                <img
                  src={session.user?.image!}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm text-gray-600">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {session ? (
          <>
            {/* Sheet URL */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">
                📄 Google Sheet URL
              </h2>
              <p className="text-sm text-gray-400 mb-2">
                Sheet must be public. Expected columns:{" "}
                <code>Company Name</code>, <code>Career Page URL</code>
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
              <h2 className="text-lg font-semibold mb-2">
                📄 Upload Resume{" "}
                <span className="text-sm text-gray-400 font-normal">
                  (optional but recommended)
                </span>
              </h2>
              <p className="text-sm text-gray-400 mb-3">
                AI will match jobs based on your actual resume
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {resumeUploading && (
                <p className="text-sm text-blue-500 mt-2">
                  Extracting resume...
                </p>
              )}
              {resumeText && !resumeUploading && (
                <p className="text-sm text-green-600 mt-2">
                  ✅ Resume loaded successfully!
                </p>
              )}
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">
                ⚙️ Your Preferences
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">
                    Job Type
                  </label>
                  <select
                    value={preferences.jobType}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        jobType: e.target.value,
                      })
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
                      setPreferences({
                        ...preferences,
                        experience: e.target.value,
                      })
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
                      setPreferences({
                        ...preferences,
                        location: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Auto Scan */}
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-2">⏰ Daily Auto-Scan</h2>
              <p className="text-sm text-gray-400 mb-3">
                We'll scan every day at 9:30 AM and email you the results
              </p>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-800 mb-3"
              />
              <button
                onClick={saveConfig}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-xl transition"
              >
                {autoScanEnabled
                  ? "✅ Auto-Scan Enabled"
                  : "Enable Daily Auto-Scan"}
              </button>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl mb-4 transition"
            >
              {loading
                ? `Scanning... (${progress.current}/${progress.total})`
                : "🚀 Start Scanning"}
            </button>

            {/* Write to Sheet */}
            <button
              onClick={writeToSheet}
              className="w-full sm:w-auto text-sm bg-green-100 hover:bg-green-200 text-green-800 px-4 py-1.5 rounded-lg mb-8"
            >
              📊 Write to Sheet
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold mb-4">📊 Results</h2>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {["High", "Medium", "Low", "No Opening"].map((r) => (
                    <div
                      key={r}
                      className={`rounded-xl p-3 text-center ${ratingColor[r]}`}
                    >
                      <div className="text-2xl font-bold">
                        {results.filter((x) => x.rating === r).length}
                      </div>
                      <div className="text-xs font-medium">{r}</div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800"
                  >
                    <option value="All">All Ratings</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                    <option value="No Opening">No Opening</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800"
                  >
                    <option value="default">Default Order</option>
                    <option value="rating">Sort by Rating</option>
                    <option value="company">Sort by Company</option>
                  </select>

                  <span className="text-sm text-gray-400 self-center">
                    Showing {filteredResults.length} of {results.length}
                  </span>

                  <button
                    onClick={exportCSV}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg"
                  >
                    ⬇️ Export CSV
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b">
                        <th className="pb-2">Company</th>
                        <th className="pb-2">Rating</th>
                        <th className="pb-2">Reason</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((r, i) => (
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
                          <td className="py-3">
                            <select
                              value={r.status || "Not Applied"}
                              onChange={(e) =>
                                updateStatus(
                                  i,
                                  e.target.value as CompanyResult["status"],
                                )
                              }
                              className={`text-xs px-2 py-1 rounded-lg border-0 font-semibold cursor-pointer ${statusColor[r.status || "Not Applied"]}`}
                            >
                              <option value="Not Applied">Not Applied</option>
                              <option value="Applied">📝 Applied</option>
                              <option value="Interviewing">
                                📞 Interviewing
                              </option>
                              <option value="Offered">✅ Offered</option>
                              <option value="Rejected">❌ Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <p className="text-2xl mb-4">👋</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Sign in to get started
            </h2>
            <p className="text-gray-400 mb-6">
              Scan company career pages and find your perfect job match
            </p>
            <button
              onClick={() => signIn("google")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold"
            >
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
