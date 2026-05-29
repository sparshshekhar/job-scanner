import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // Get saved config from Redis
    const config = await redis.get("scan_config") as any;
    if (!config) {
      return NextResponse.json({ message: "No scan config found" });
    }

    const { sheetUrl, preferences, resumeText, email } = config;

    // Read sheet
    const sheetRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/read-sheet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetUrl }),
    });
    const { companies } = await sheetRes.json();

    // Scan each company
    const results = [];
    for (const company of companies) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/scan-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, preferences, resumeText }),
      });
      const data = await res.json();
      results.push({ company: company.name, url: company.url, ...data });
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Save results to Redis
    await redis.set("latest_results", JSON.stringify(results));
    await redis.set("last_scanned", new Date().toISOString());

    // Send email
    const highMatches = results.filter((r) => r.rating === "High");
    const mediumMatches = results.filter((r) => r.rating === "Medium");

    await resend.emails.send({
      from: "Job Scanner <onboarding@resend.dev>",
      to: email,
      subject: `🔍 Daily Job Scan — ${highMatches.length} High matches found!`,
      html: `
        <h2>Your Daily Job Scan Results</h2>
        <p>Scanned ${results.length} companies</p>
        
        <h3>🟢 High Matches (${highMatches.length})</h3>
        ${highMatches.map(r => `<p><a href="${r.url}">${r.company}</a> — ${r.reason}</p>`).join("")}
        
        <h3>🟡 Medium Matches (${mediumMatches.length})</h3>
        ${mediumMatches.map(r => `<p><a href="${r.url}">${r.company}</a> — ${r.reason}</p>`).join("")}
        
        <p>Open the app to see all results.</p>
      `,
    });

    return NextResponse.json({ success: true, scanned: results.length });
  } catch (err) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}