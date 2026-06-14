"use client";
import { signIn } from "next-auth/react";

export default function Landing() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Built for job seekers in India 🇮🇳
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Stop checking 100 career pages.
          <br />
          Let AI do it for you.
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          Upload a list of companies, set your preferences, and get a daily
          ranked report of which companies have jobs matching your profile —
          sent straight to your inbox.
        </p>
        <button
          onClick={() => signIn("google")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg transition"
        >
          Get Started Free with Google
        </button>
        <p className="text-sm text-gray-400 mt-3">No credit card required</p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow p-6 sm:p-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Add your companies
            </h3>
            <p className="text-sm text-gray-500">
              Paste a Google Sheet with company names and career page links —
              even 100+ at once.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Set your preferences
            </h3>
            <p className="text-sm text-gray-500">
              Upload your resume or tell us your role, experience, and skills.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Get ranked results
            </h3>
            <p className="text-sm text-gray-500">
              Every company gets rated High/Medium/Low/No Opening — with
              reasons, daily in your inbox.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Everything you need to job hunt smarter
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: "📄",
              title: "Resume-based matching",
              desc: "AI reads your resume and matches it against real job listings.",
            },
            {
              icon: "⏰",
              title: "Daily auto-scan",
              desc: "Runs every morning automatically — no manual work needed.",
            },
            {
              icon: "📧",
              title: "Instant email alerts",
              desc: "Get notified the moment a High match is found.",
            },
            {
              icon: "📊",
              title: "Google Sheet sync",
              desc: "Results written back to your sheet automatically.",
            },
            {
              icon: "📝",
              title: "Application tracker",
              desc: "Mark companies as Applied, Interviewing, Offered, or Rejected.",
            },
            {
              icon: "⬇️",
              title: "CSV export",
              desc: "Download your results anytime to share or analyze.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl shadow p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-blue-600 rounded-2xl p-10 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">
          Ready to find your next job faster?
        </h2>
        <p className="text-blue-100 mb-6">
          Free to use. Sign in with Google and start your first scan in under a
          minute.
        </p>
        <button
          onClick={() => signIn("google")}
          className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-50 transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
