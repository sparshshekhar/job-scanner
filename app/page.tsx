"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Landing from "@/components/Landing";
import toast from "react-hot-toast";

export type Preferences = {
  jobType: string;
  experience: string;
  skills: string;
  location: string;
  salary?: string;
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
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sheetUrl, setSheetUrl] = useState("");
  const [preferences, setPreferences] = useState<Preferences>({
    jobType: "AI Engineer, Full Stack",
    experience: "1-3 years",
    skills: "React, TypeScript, Python",
    location: "Noida, Remote",
    salary: "₹10L - ₹20L",
  });
  
  // Custom tag input states
  const [jobTitleInput, setJobTitleInput] = useState("");
  
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeScanCompany, setActiveScanCompany] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileSize, setResumeFileSize] = useState("");
  const [resumeUploadDate, setResumeUploadDate] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [email, setEmail] = useState("");
  const [autoScanEnabled, setAutoScanEnabled] = useState(false);
  
  // Advanced filters state
  const [filterRating, setFilterRating] = useState("All");
  const [filterCompanyType, setFilterCompanyType] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterSalary, setFilterSalary] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDate, setFilterDate] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expanded detail drawer
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<{
    plan: string;
    expiresAt?: string;
  }>({ plan: "Free" });

  // Load theme and configure root HTML class
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    const initialTheme = savedTheme || "dark";
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setTimeout(() => {
      setTheme(initialTheme);
    }, 0);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
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
        if (config?.preferences) {
          setPreferences((prev) => ({
            ...prev,
            ...config.preferences,
          }));
        }
        if (config?.email) setEmail(config.email);
        if (config?.resumeFileName) setResumeFileName(config.resumeFileName);
        if (config?.resumeFileSize) setResumeFileSize(config.resumeFileSize);
        if (config?.resumeUploadDate) setResumeUploadDate(config.resumeUploadDate);

        // Load subscription status
        const subRes = await fetch("/api/get-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user!.email }),
        });
        const subData = await subRes.json();
        setSubscription(subData);
      } catch (err) {
        console.error("Load error:", err);
      }
    };

    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // Tag helper logic
  const getJobTags = () => {
    if (!preferences.jobType) return [];
    return preferences.jobType.split(",").map(t => t.trim()).filter(Boolean);
  };

  const addJobTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const currentTags = getJobTags();
    if (currentTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setJobTitleInput("");
      return;
    }
    const newTags = [...currentTags, trimmed].join(", ");
    setPreferences({ ...preferences, jobType: newTags });
    setJobTitleInput("");
  };

  const removeJobTag = (indexToRemove: number) => {
    const currentTags = getJobTags();
    const newTags = currentTags.filter((_, i) => i !== indexToRemove).join(", ");
    setPreferences({ ...preferences, jobType: newTags });
  };

  // Drag and Drop Resume Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file only");
      return;
    }
    setResumeUploading(true);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    
    const formData = new FormData();
    formData.append("resume", file);
    
    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResumeText(data.text);
      setResumeFileName(file.name);
      setResumeFileSize(`${sizeMB}MB`);
      
      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      setResumeUploadDate(dateStr);
      
      toast.success("Resume uploaded and parsed successfully!");
    } catch (err) {
      toast.error("Failed to parse resume");
      console.error(err);
    } finally {
      setResumeUploading(false);
    }
  };

  const saveConfig = async () => {
    if (!email) return toast.error("Please enter your email first");
    const res = await fetch("/api/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        sheetUrl, 
        preferences, 
        resumeText, 
        email,
        resumeFileName,
        resumeFileSize,
        resumeUploadDate
      }),
    });
    if (res.ok) {
      setAutoScanEnabled(true);
      toast.success("Daily auto-scan enabled!");
    } else {
      toast.error("Failed to save auto-scan settings");
    }
  };

  const writeToSheet = async () => {
    if (!results.length) return toast.error("No results to write yet!");
    const res = await fetch("/api/write-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl, results }),
    });
    if (res.ok) toast.success("Results written to Google Sheet!");
    else toast.error("Failed to write to sheet");
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

  const handleUpgrade = async () => {
    const orderRes = await fetch("/api/create-order", { method: "POST" });
    const order = await orderRes.json();

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Job Scanner Pro",
      description: "Monthly Subscription",
      order_id: order.id,
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            email: session?.user?.email,
          }),
        });
        const data = await verifyRes.json();
        if (data.success) {
          toast.success("Welcome to Pro! 🎉");
          setSubscription({ plan: "Pro" });
        } else {
          toast.error("Payment verification failed");
        }
      },
      prefill: {
        email: session?.user?.email,
        name: session?.user?.name,
      },
      theme: { color: "#4f46e5" },
    };

    const rzp = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
    rzp.open();
  };

  const handleScan = async () => {
    if (!sheetUrl) return toast.error("Please enter a Google Sheet URL");
    setLoading(true);
    setResults([]);
    setExpandedRow(null);

    const sheetRes = await fetch("/api/read-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl }),
    });
    const { companies } = await sheetRes.json();
    if (!companies?.length) {
      toast.error(
        "No companies found. Check the sheet URL and make it public.",
      );
      setLoading(false);
      return;
    }

    // Enforce free plan limit
    const limit = subscription.plan === "Pro" ? companies.length : 10;
    if (subscription.plan === "Free" && companies.length > 10) {
      toast.error(
        "Free plan is limited to 10 companies. Upgrade to Pro for unlimited!",
      );
    }
    const limitedCompanies = companies.slice(0, limit);

    const initial: CompanyResult[] = limitedCompanies.map((c: { name: string; url: string }) => ({
      company: c.name,
      url: c.url,
      rating: "Pending",
      reason: "Scanning...",
      status: "Not Applied",
    }));
    setResults(initial);
    setProgress({ current: 0, total: limitedCompanies.length });

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
    for (let i = 0; i < limitedCompanies.length; i++) {
      setActiveScanCompany(limitedCompanies[i].name);
      const res = await fetch("/api/scan-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: limitedCompanies[i],
          preferences,
          resumeText,
        }),
      });
      const data = await res.json();
      final[i] = {
        ...final[i],
        rating: data.rating,
        reason: data.reason,
        status: statuses[limitedCompanies[i].name] || "Not Applied",
      };
      setResults([...final]);
      setProgress({ current: i + 1, total: limitedCompanies.length });
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
          resumeFileName,
          resumeFileSize,
          resumeUploadDate
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

  // Helper algorithms for simulated mock data in results list matching the image
  const getMatchPercentage = (companyName: string, rating: string) => {
    if (rating === "Pending" || rating === "") return 0;
    if (rating === "No Opening") return 0;
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    if (rating === "High") return 85 + (hash % 14); // 85% - 98%
    if (rating === "Medium") return 60 + (hash % 25); // 60% - 84%
    if (rating === "Low") return 30 + (hash % 30); // 30% - 59%
    return 0;
  };

  const getCompanyType = (companyName: string) => {
    const mncs = ["google", "microsoft", "amazon", "meta", "netflix", "stripe", "airbnb", "uber", "adobe", "salesforce", "oracle", "intel", "ibm", "cisco", "tcs", "infosys", "wipro", "cognizant", "accenture"];
    const nameLower = companyName.toLowerCase();
    return mncs.some(m => nameLower.includes(m)) ? "MNC" : "Startup";
  };

  const getStarRating = (rating: string) => {
    if (rating === "High") return 4.0;
    if (rating === "Medium") return 3.5;
    if (rating === "Low") return 2.0;
    return 0.0;
  };

  const getCompanyLogoInfo = (companyName: string) => {
    const logoMap: Record<string, { logo: string; bg: string }> = {
      google: { logo: "G", bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
      airbnb: { logo: "A", bg: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
      stripe: { logo: "S", bg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
      vercel: { logo: "▲", bg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
      netflix: { logo: "N", bg: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
    };

    const key = companyName.toLowerCase();
    for (const prefix in logoMap) {
      if (key.includes(prefix)) return logoMap[prefix];
    }
    
    // Fallback logo generator based on first letter
    const colors = [
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
    ];
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    
    return {
      logo: companyName.charAt(0).toUpperCase(),
      bg: colors[colorIndex]
    };
  };

  const getCompanyDetails = (companyName: string) => {
    const formatted = companyName.replace(/\s+/g, "").toLowerCase();
    return `${formatted}@gmail.com`;
  };

  // Status mapping colors matching dashboard image
  const statusColor: Record<string, string> = {
    "Not Applied": "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    Applied: "bg-blue-600 text-white border border-blue-700 dark:bg-blue-500 dark:text-white dark:border-blue-600 shadow-sm",
    Interviewing: "bg-purple-accent-light text-purple-accent border border-purple-accent-light dark:bg-purple-accent-light/10 dark:text-purple-accent dark:border-purple-accent/30",
    Offered: "bg-emerald-accent-light text-emerald-accent border border-emerald-accent-light dark:bg-emerald-accent-light/10 dark:text-emerald-accent dark:border-emerald-accent/30",
    Rejected: "bg-ruby-accent-light text-ruby-accent border border-ruby-accent-light dark:bg-ruby-accent-light/10 dark:text-ruby-accent dark:border-ruby-accent/30",
  };

  // Metrics calculators
  const scansDoneCount = results.length;
  const activeJobsCount = results.filter(r => r.rating === "High" || r.rating === "Medium").length;
  const inactiveJobsCount = results.filter(r => r.rating === "No Opening" || r.rating === "Low").length;
  
  const avgMatchPercent = (() => {
    const scoredList = results.filter(r => r.rating !== "Pending" && r.rating !== "No Opening" && r.rating !== "");
    if (!scoredList.length) return 0;
    const sum = scoredList.reduce((acc, r) => acc + getMatchPercentage(r.company, r.rating), 0);
    return Math.round(sum / scoredList.length);
  })();

  // Filter and Sort results
  const filteredResults = results
    .filter((r) => {
      // Rating filter
      if (filterRating !== "All" && r.rating !== filterRating) return false;
      
      // Status filter
      if (filterStatus !== "All") {
        const checkStatus = r.status || "Not Applied";
        if (checkStatus !== filterStatus) return false;
      }
      
      // Company Type filter
      if (filterCompanyType !== "All" && getCompanyType(r.company) !== filterCompanyType) return false;
      
      // Search query filter
      if (searchQuery && !r.company.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "rating") {
        const order = ["High", "Medium", "Low", "No Opening", "Pending"];
        return order.indexOf(a.rating) - order.indexOf(b.rating);
      }
      if (sortBy === "match") {
        return getMatchPercentage(b.company, b.rating) - getMatchPercentage(a.company, a.rating);
      }
      return 0;
    });

  return (
    <main className="min-h-screen grid-bg relative py-6">
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-6">
        
        {/* Header */}
        <header className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm border border-card-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-md shadow-accent/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Job Scanner</h1>
              <p className="text-xs text-text-muted">Automated Career Board Inspector</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                {/* Upgrade Button */}
                {subscription?.plan === "Pro" ? (
                  <span className="text-xs bg-teal-500/10 text-teal-600 border border-teal-500/20 px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider">
                    ⚡ Pro User
                  </span>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    className="text-xs bg-gradient-to-r from-accent to-purple-accent hover:opacity-95 text-white px-4 py-2 rounded-xl font-extrabold shadow-md uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Upgrade to Pro</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">₹299</span>
                  </button>
                )}

                {/* Profile Widget */}
                <div className="flex items-center gap-2 bg-card border border-card-border px-3.5 py-1.5 rounded-xl text-sm font-semibold">
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session?.user?.image}
                      className="w-6 h-6 rounded-full border border-card-border"
                      alt={session?.user?.name || "avatar"}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                      {session?.user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="text-foreground hidden md:inline truncate max-w-[120px]">
                    {session?.user?.name || "Alex R."}
                  </span>
                  <svg className="w-4 h-4 text-text-muted ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>

                {/* Light/Dark switcher */}
                <div className="flex items-center gap-1 bg-card border border-card-border p-1 rounded-xl shadow-sm">
                  <button
                    onClick={toggleTheme}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${theme === "light" ? "bg-accent text-white" : "text-text-muted hover:text-foreground"}`}
                    aria-label="Light Mode"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25m-13.5 0H3m2.293-6.293l1.594 1.594m10.796 10.796l1.594 1.594m0-13.5l-1.594 1.594M6.293 17.707l-1.594 1.594M5.25 12a6.75 6.75 0 1113.5 0 6.75 6.75 0 01-13.5 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={toggleTheme}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${theme === "dark" ? "bg-accent text-white" : "text-text-muted hover:text-foreground"}`}
                    aria-label="Dark Mode"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => signOut()}
                  className="bg-card hover:bg-ruby-accent/10 border border-card-border hover:border-ruby-accent/30 text-text-muted hover:text-ruby-accent px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        {session ? (
          <>
            {/* Sheet URL Import card */}
            <div className="bg-card rounded-2xl border border-card-border p-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground mb-1.5">Import Jobs from Sheet</h2>
              <p className="text-xs text-text-muted mb-4">
                Google spreadsheet must be public. Expected headers: <code className="bg-background px-1.5 py-0.5 rounded font-mono border border-card-border">Company Name</code>, <code className="bg-background px-1.5 py-0.5 rounded font-mono border border-card-border">Career Page URL</code>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full border border-card-border bg-background rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-foreground placeholder:text-text-muted/60"
                  />
                </div>
                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="bg-accent hover:bg-accent-hover disabled:bg-accent/40 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Import & Scan Jobs
                </button>
              </div>
            </div>

            {/* Resume Upload & Preferences Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Drag & Drop Resume */}
              <div className="lg:col-span-5 bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-foreground">Upload Resume</h2>
                    <span className="text-xs text-text-muted font-normal">(PDF only)</span>
                  </div>
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                      dragActive
                        ? "border-accent bg-accent/5"
                        : "border-card-border hover:border-accent hover:bg-accent-light/10"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {resumeUploading ? (
                      <div className="space-y-2">
                        <svg className="animate-spin h-8 w-8 text-accent mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-sm font-semibold text-accent">Extracting CV metadata...</p>
                      </div>
                    ) : resumeFileName ? (
                      <div className="space-y-3 w-full">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-ruby-accent/10 text-ruby-accent mx-auto border border-ruby-accent/20">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground truncate max-w-xs mx-auto">{resumeFileName}</p>
                          <p className="text-xs text-text-muted mt-0.5">{resumeFileSize} • Uploaded {resumeUploadDate}</p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-emerald-accent-light text-emerald-accent px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-emerald-accent rounded-full" />
                          Parsed
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto shadow-sm">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">Click to upload or drag & drop</p>
                          <p className="text-xs text-text-muted mt-0.5">Your profile tags will sync with details found</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {resumeFileName && (
                  <button 
                    onClick={() => {
                      setResumeFileName("");
                      setResumeFileSize("");
                      setResumeText("");
                      setResumeUploadDate("");
                    }}
                    className="w-full mt-4 bg-background hover:bg-ruby-accent/10 border border-card-border hover:border-ruby-accent/30 text-text-muted hover:text-ruby-accent py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Remove Resume
                  </button>
                )}
              </div>

              {/* Right Column: Preferences form */}
              <div className="lg:col-span-7 bg-card rounded-2xl border border-card-border p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground">Job Preferences</h2>
                
                <div className="space-y-4">
                  
                  {/* Job Title tags */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Job Title</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 border border-card-border bg-background rounded-xl min-h-[48px]">
                      {getJobTags().map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent font-bold text-xs pl-3 pr-1.5 py-1 rounded-lg">
                          <span>{tag}</span>
                          <button
                            onClick={() => removeJobTag(idx)}
                            className="hover:bg-accent/20 text-accent rounded-full p-0.5 w-4 h-4 flex items-center justify-center transition-all cursor-pointer font-extrabold text-[10px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={getJobTags().length ? "" : "Add title tag (e.g. AI Engineer)..."}
                        value={jobTitleInput}
                        onChange={(e) => setJobTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addJobTag(jobTitleInput);
                          }
                        }}
                        className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground py-1 px-1 min-w-[120px] focus:ring-0"
                      />
                    </div>
                    {/* Quick Suggestions list */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-text-muted uppercase font-bold mr-1">Quick Add:</span>
                      {["AI Engineer", "Full Stack", "Frontend", "Backend", "Data Analyst", "DevOps"].map((k) => (
                        <button
                          key={k}
                          onClick={() => addJobTag(k)}
                          className="bg-background hover:bg-card-border/50 border border-card-border rounded-lg px-2.5 py-1 text-[11px] font-bold text-foreground transition-all cursor-pointer"
                        >
                          + {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Inputs: Location & Salary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Location</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Noida, Gurgaon, Remote"
                          value={preferences.location}
                          onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
                          className="w-full pl-9 pr-4 py-2.5 border border-card-border bg-background rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Salary Range</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                          <span className="text-sm font-bold">₹</span>
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. ₹10L - ₹20L"
                          value={preferences.salary}
                          onChange={(e) => setPreferences({ ...preferences, salary: e.target.value })}
                          className="w-full pl-7 pr-4 py-2.5 border border-card-border bg-background rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Skills Comma list */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Target Skills (comma separated)</label>
                    <input
                      type="text"
                      placeholder="React, TypeScript, Python, TensorFlow..."
                      value={preferences.skills}
                      onChange={(e) => setPreferences({ ...preferences, skills: e.target.value })}
                      className="w-full px-4 py-2.5 border border-card-border bg-background rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted/60"
                    />
                  </div>

                </div>
              </div>

            </div>

            {/* Daily Auto Scan Card & Active Scan controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Daily Auto-scan email */}
              <div className="md:col-span-5 bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⏰</span>
                    <h2 className="text-base font-bold text-foreground">Daily Auto-Scan Alerts</h2>
                  </div>
                  <p className="text-xs text-text-muted mb-4">
                    Monitor sheets automatically. Runs daily at 9:30 AM and emails matching high-fit reports.
                  </p>
                  
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-card-border bg-background rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted/60 mb-3"
                  />
                </div>
                
                <button
                  onClick={saveConfig}
                  className="w-full bg-emerald-accent hover:bg-emerald-accent/90 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer text-sm shadow-sm"
                >
                  {autoScanEnabled ? "✅ Daily Scan Scheduled" : "Enable Daily Auto-Scan"}
                </button>
              </div>

              {/* Start Scan Button & Logs */}
              <div className="md:col-span-7 bg-card rounded-2xl border border-card-border p-6 shadow-sm flex flex-col justify-between min-h-[180px]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-base font-bold text-foreground">Scanner Operations</h2>
                    <p className="text-xs text-text-muted">Launch manual career page scans in real-time</p>
                  </div>
                  {loading && (
                    <span className="text-xs text-accent font-bold uppercase animate-pulse flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-accent rounded-full animate-ping" />
                      Active Scanning
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-3 py-2">
                    <div className="flex items-center justify-between text-xs text-foreground font-bold">
                      <span>Scanning: <span className="text-accent">{activeScanCompany}</span></span>
                      <span>{progress.current}/{progress.total} Completed</span>
                    </div>
                    <div className="w-full bg-background border border-card-border h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-accent h-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-text-muted italic">Downloading career listings, verifying roles and extracting match confidence logs...</div>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted py-2">
                    {results.length > 0 ? (
                      <span className="text-xs">Scan completed successfully. Results loaded. Filters and CSV tools unlocked below.</span>
                    ) : (
                      <span className="text-xs">Sheet URL and preferences loaded. Click the button below to initiate manual AI crawler.</span>
                    )}
                  </div>
                )}

                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-accent to-purple-accent hover:opacity-95 disabled:opacity-40 text-white font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-accent/20 cursor-pointer flex items-center justify-center gap-2 text-sm mt-3 uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scanning companies ({progress.current}/{progress.total})
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      🚀 Start AI Scan Operations
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Results sections */}
            {results.length > 0 && (
              <div className="space-y-6">
                
                {/* Scan Overview & Analytics Section */}
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-foreground tracking-tight">Scan Overview & Analytics</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Card 1: Scans Summary */}
                    <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-text-muted uppercase">Scans Summary</span>
                        <div className="text-3xl font-extrabold text-foreground">{scansDoneCount}</div>
                        <p className="text-[10px] text-emerald-accent font-bold">Total (+2 today)</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center text-xl font-bold">
                        📊
                      </div>
                    </div>

                    {/* Card 2: Active Jobs Matched */}
                    <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-text-muted uppercase">Active Jobs Matched</span>
                        <div className="text-3xl font-extrabold text-foreground">{activeJobsCount}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-accent" />
                          <span className="text-[10px] text-emerald-accent font-bold">Emerald Green</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-accent/10 text-emerald-accent flex items-center justify-center text-xl font-bold">
                        🟢
                      </div>
                    </div>

                    {/* Card 3: No Openings Found */}
                    <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-text-muted uppercase">No Openings Found</span>
                        <div className="text-3xl font-extrabold text-foreground">{inactiveJobsCount}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-ruby-accent" />
                          <span className="text-[10px] text-ruby-accent font-bold">No openings</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-ruby-accent/10 text-ruby-accent flex items-center justify-center text-xl font-bold">
                        🔴
                      </div>
                    </div>

                    {/* Card 4: Avg. Profile Match */}
                    <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-text-muted uppercase">Avg. Profile Match</span>
                        <div className="text-3xl font-extrabold text-foreground">{avgMatchPercent}%</div>
                        <p className="text-[10px] text-text-muted font-semibold">Active listing averages</p>
                      </div>
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-card-border"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="text-accent transition-all duration-500"
                            strokeDasharray={`${avgMatchPercent}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-foreground">
                          {avgMatchPercent}%
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Advanced Filter Bar (With dropdowns & title matching image) */}
                <div className="glass-panel border border-card-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">Advanced Glassmorphic</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <input
                          type="text"
                          placeholder="Search company..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full sm:w-48 bg-background border border-card-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-text-muted/70 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          setFilterRating("All");
                          setFilterCompanyType("All");
                          setFilterLocation("All");
                          setFilterSalary("All");
                          setFilterStatus("All");
                          setFilterDate("All");
                          setSearchQuery("");
                          setSortBy("default");
                          toast.success("Filters reset!");
                        }}
                        className="bg-background border border-card-border hover:bg-card-border/30 text-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="text-xs">🔍</span> Reset
                      </button>
                      
                      <button 
                        onClick={exportCSV}
                        className="bg-accent text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-accent-hover transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>⬇️ Export CSV</span>
                      </button>
                      
                      <button 
                        onClick={writeToSheet}
                        className="bg-emerald-accent text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>📊 Sync Sheet</span>
                      </button>
                    </div>
                  </div>

                  {/* Row of Dropdown filters from the approved image */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2 border-t border-card-border/40">
                    
                    {/* Ratings */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Ratings</label>
                      <select
                        value={filterRating}
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All Ratings</option>
                        <option value="High">4.0+ High</option>
                        <option value="Medium">3.0+ Medium</option>
                        <option value="Low">2.0+ Low</option>
                        <option value="No Opening">No Opening</option>
                      </select>
                    </div>

                    {/* Alphabetical */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Alphabetical</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="default">Default Order</option>
                        <option value="company">A-Z Sorted</option>
                        <option value="match">Match % Sorted</option>
                        <option value="rating">Rating Sorted</option>
                      </select>
                    </div>

                    {/* Company Type */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Company Type</label>
                      <select
                        value={filterCompanyType}
                        onChange={(e) => setFilterCompanyType(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All types</option>
                        <option value="MNC">MNC/Corporates</option>
                        <option value="Startup">Startups</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Location</label>
                      <select
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All Locations</option>
                        <option value="Noida">Noida/Gurgaon</option>
                        <option value="Remote">Remote</option>
                        <option value="USA">USA/Global</option>
                      </select>
                    </div>

                    {/* Salary */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Salary</label>
                      <select
                        value={filterSalary}
                        onChange={(e) => setFilterSalary(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All Salaries</option>
                        <option value="10L+">₹10k+ / ₹10L+</option>
                        <option value="20L+">₹20k+ / ₹20L+</option>
                      </select>
                    </div>

                    {/* Date of Posting */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Date of Posting</label>
                      <select
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All dates</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                      </select>
                    </div>

                    {/* Application Status */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-text-muted">Application Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="All">All statuses</option>
                        <option value="Not Applied">Not Applied</option>
                        <option value="Applied">Applied</option>
                        <option value="Interviewing">Interviewing</option>
                        <option value="Offered">Offered</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* Company Results Table List */}
                <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-text-muted border-b border-card-border bg-background/50 text-xs font-bold select-none">
                          <th className="py-4 px-6 w-[40%]">Company Name</th>
                          <th className="py-4 px-4 text-center w-[15%]">Match %</th>
                          <th className="py-4 px-4 text-center w-[15%]">Ratings</th>
                          <th className="py-4 px-4 text-center w-[18%]">Application Status</th>
                          <th className="py-4 px-6 text-right w-[12%]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((r, i) => {
                          const logoInfo = getCompanyLogoInfo(r.company);
                          const isExpanded = expandedRow === i;
                          const percent = getMatchPercentage(r.company, r.rating);
                          const stars = getStarRating(r.rating);
                          const details = getCompanyDetails(r.company);

                          // Scan state evaluation flags
                          const isPending = r.rating === "Pending";
                          const hasNoOpenings = r.rating === "No Opening";
                          const isScanFailure = r.reason.includes("Could not scan") || r.reason.includes("Could not fetch");

                          // Check if any preferences are set
                          const hasSkillsPref = !!preferences.skills?.trim();
                          const hasLocationPref = !!preferences.location?.trim();
                          const hasPreferences = hasSkillsPref || hasLocationPref;

                          // Dynamic skills evaluation
                          const userSkills = hasSkillsPref
                            ? preferences.skills.split(",").map((s) => s.trim()).filter(Boolean)
                            : [];
                          const matchedSkills: string[] = [];
                          const missingSkills: string[] = [];
                          const reasonLower = r.reason ? r.reason.toLowerCase() : "";

                          userSkills.forEach((skill) => {
                            if (reasonLower.includes(skill.toLowerCase())) {
                              matchedSkills.push(skill);
                            } else {
                              missingSkills.push(skill);
                            }
                          });

                          // Fallbacks if reason does not explicitly list the skills but rating is High/Medium
                          if (r.rating === "High" && matchedSkills.length === 0) {
                            matchedSkills.push(...userSkills);
                          } else if (r.rating === "Low" && matchedSkills.length === 0) {
                            missingSkills.push(...userSkills);
                          }

                          // Dynamic location matching logic
                          let locationFits = false;
                          if (hasLocationPref) {
                            const userLocs = preferences.location
                              .split(",")
                              .map((l) => l.trim().toLowerCase())
                              .filter(Boolean);
                            const hasRemotePref = userLocs.some((l) => l.includes("remote"));
                            const reasonMentionsRemote =
                              reasonLower.includes("remote") ||
                              reasonLower.includes("work from home") ||
                              reasonLower.includes("wfh");
                            const hasLocationMatch = userLocs.some((loc) => reasonLower.includes(loc));

                            if (
                              hasLocationMatch ||
                              (hasRemotePref && reasonMentionsRemote) ||
                              r.rating === "High" ||
                              r.rating === "Medium"
                            ) {
                              locationFits = true;
                            }
                          }
                          
                          return (
                            <Fragment key={i}>
                              {/* Row Clickable */}
                              <tr 
                                onClick={() => setExpandedRow(isExpanded ? null : i)}
                                className={`border-b border-card-border/50 hover:bg-card-border/10 transition-all cursor-pointer ${
                                  r.rating === "High" ? "bg-emerald-accent/5" : ""
                                }`}
                              >
                                {/* Company info */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm border border-card-border/30 ${logoInfo.bg}`}>
                                      {logoInfo.logo}
                                    </div>
                                    <div>
                                      <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="font-bold text-foreground hover:text-accent hover:underline flex items-center gap-1 text-sm"
                                      >
                                        <span>{r.company}</span>
                                        <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                      </a>
                                      <div className="text-xs text-text-muted mt-0.5">{details}</div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Match Percentage circular indicator */}
                                <td className="py-4 px-4 text-center">
                                  {r.rating === "Pending" ? (
                                    <div className="h-6 w-16 bg-card-border rounded-full animate-pulse mx-auto" />
                                  ) : r.rating === "No Opening" ? (
                                    <span className="text-xs font-semibold text-text-muted">No Openings</span>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <div className="relative w-8 h-8">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                          <path
                                            className="text-card-border"
                                            strokeWidth="3.5"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                          <path
                                            className="text-accent"
                                            strokeDasharray={`${percent}, 100`}
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-foreground">
                                          {percent}%
                                        </span>
                                      </div>
                                      <span className="text-xs font-bold text-foreground hidden sm:inline">Match</span>
                                      <svg className={`w-3.5 h-3.5 text-text-muted transition-all ${isExpanded ? "transform rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                      </svg>
                                    </div>
                                  )}
                                </td>

                                {/* Star Ratings */}
                                <td className="py-4 px-4 text-center">
                                  {r.rating === "Pending" ? (
                                    <div className="h-4 w-20 bg-card-border rounded animate-pulse mx-auto" />
                                  ) : r.rating === "No Opening" ? (
                                    <span className="text-xs text-text-muted">N/A</span>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <div className="flex text-amber-400">
                                        {[1, 2, 3, 4].map((star) => (
                                          <svg key={star} className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                          </svg>
                                        ))}
                                        {stars === 3.5 ? (
                                          <svg className="w-3.5 h-3.5 fill-current opacity-40" viewBox="0 0 24 24">
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                          </svg>
                                        ) : stars === 2.0 ? (
                                          <div className="flex opacity-25">
                                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                                          </div>
                                        ) : null}
                                      </div>
                                      <span className="text-xs text-text-muted font-bold ml-1">{stars.toFixed(1)}</span>
                                    </div>
                                  )}
                                </td>

                                {/* Application status dropdown pill */}
                                <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={r.status || "Not Applied"}
                                    onChange={(e) =>
                                      updateStatus(
                                        i,
                                        e.target.value as CompanyResult["status"],
                                      )
                                    }
                                    className={`text-xs px-3 py-1 rounded-full font-bold cursor-pointer outline-none transition-all ${
                                      statusColor[r.status || "Not Applied"]
                                    }`}
                                  >
                                    <option value="Not Applied" className="bg-card text-foreground font-semibold">Not Applied</option>
                                    <option value="Applied" className="bg-card text-foreground font-semibold">Applied</option>
                                    <option value="Interviewing" className="bg-card text-foreground font-semibold">Interviewing</option>
                                    <option value="Offered" className="bg-card text-foreground font-semibold">Offered</option>
                                    <option value="Rejected" className="bg-card text-foreground font-semibold">Rejected</option>
                                  </select>
                                </td>
                                
                                {/* Row actions menu trigger */}
                                <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                                    className="p-1 rounded-lg hover:bg-card-border/40 text-text-muted hover:text-foreground cursor-pointer transition-all"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded drawer row */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="bg-background/40 p-5 border-b border-card-border/50 animate-slide-up">
                                    <div className="bg-card border border-card-border rounded-xl p-5 space-y-4 shadow-inner">
                                      <div>
                                        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">AI Match Rationale</h3>
                                        <p className="text-sm text-foreground leading-relaxed">{r.reason}</p>
                                      </div>
                                      
                                      {isPending ? (
                                        <div className="bg-card-border/20 border border-card-border/50 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                                          <div className="text-text-muted p-1 bg-card-border/30 rounded-lg">
                                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-bold text-foreground">Evaluating Criteria...</h4>
                                            <p className="text-[11px] text-text-muted mt-0.5">AI scanner is running checks against your preferences. The results will appear here shortly.</p>
                                          </div>
                                        </div>
                                      ) : isScanFailure ? (
                                        <div className="bg-ruby-accent/5 border border-ruby-accent/15 rounded-xl p-4 flex items-start gap-3">
                                          <div className="text-ruby-accent p-1 bg-ruby-accent/10 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-bold text-ruby-accent">Scan Failed</h4>
                                            <p className="text-[11px] text-text-muted mt-0.5">This company&apos;s career page was inaccessible or could not be scanned. Skills matching criteria are unavailable.</p>
                                          </div>
                                        </div>
                                      ) : hasNoOpenings ? (
                                        <div className="bg-card-border/10 border border-card-border/30 rounded-xl p-4 flex items-start gap-3">
                                          <div className="text-text-muted p-1 bg-card-border/20 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083 1.083l-.02.041m-1.104-1.104l.02-.041m-1.104 1.104a.75.75 0 11-1.083-1.083l.02-.041m4.162 4.162a9 9 0 11-12.728 0 9 9 0 0112.728 0z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-bold text-foreground">No Openings Found</h4>
                                            <p className="text-[11px] text-text-muted mt-0.5">No active job listings were found on the career page matching your filters. Skills criteria are not applicable.</p>
                                          </div>
                                        </div>
                                      ) : !hasPreferences ? (
                                        <div className="bg-card-border/10 border border-card-border/30 rounded-xl p-4 flex items-start gap-3">
                                          <div className="text-text-muted p-1 bg-card-border/20 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083 1.083l-.02.041m-1.104-1.104l.02-.041m-1.104 1.104a.75.75 0 11-1.083-1.083l.02-.041m4.162 4.162a9 9 0 11-12.728 0 9 9 0 0112.728 0z" />
                                            </svg>
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-bold text-foreground">No Skills or Location Preferences Set</h4>
                                            <p className="text-[11px] text-text-muted mt-0.5">Please add target skills or locations in the &quot;Your Preferences&quot; panel above to evaluate matches dynamically.</p>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-card-border/50 pt-4">
                                          <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold text-emerald-accent uppercase tracking-wider">Matched Skills & Criteria</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                              {matchedSkills.map((skill, index) => (
                                                <span key={index} className="bg-emerald-accent/10 text-emerald-accent text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-accent/20">
                                                  ✓ {skill}
                                                </span>
                                              ))}
                                              {hasLocationPref && locationFits && (
                                                <span className="bg-emerald-accent/10 text-emerald-accent text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-accent/20">
                                                  ✓ Location Fits
                                                </span>
                                              )}
                                              {matchedSkills.length === 0 && (!hasLocationPref || !locationFits) && (
                                                <span className="text-xs text-text-muted italic">None</span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold text-ruby-accent uppercase tracking-wider">Missing or Unconfirmed Criteria</h4>
                                            <div className="flex flex-wrap gap-1.5">
                                              {missingSkills.map((skill, index) => (
                                                <span key={index} className="bg-ruby-accent/10 text-ruby-accent text-xs font-semibold px-2.5 py-1 rounded-md border border-ruby-accent/20">
                                                  ✗ {skill}
                                                </span>
                                              ))}
                                              {hasLocationPref && !locationFits && (
                                                <span className="bg-ruby-accent/10 text-ruby-accent text-xs font-semibold px-2.5 py-1 rounded-md border border-ruby-accent/20">
                                                  ✗ Location
                                                </span>
                                              )}
                                              {missingSkills.length === 0 && (!hasLocationPref || locationFits) && (
                                                <span className="text-xs text-text-muted italic">None</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
              </div>
            )}
          </>
        ) : (
          <Landing />
        )}
      </div>
    </main>
  );
}
