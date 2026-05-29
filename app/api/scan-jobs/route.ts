import { NextRequest, NextResponse } from "next/server";

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return text.slice(0, 6000);
  } catch {
    return "Could not fetch the page.";
  }
}

export async function POST(req: NextRequest) {
  const { company, preferences, resumeText } = await req.json();

  const pageText = await fetchPageText(company.url);

  const prompt = `You are a strict job match analyzer.

Company: ${company.name}
Career Page Content:
"""
${pageText}
"""

${resumeText ? `Candidate Resume:
"""
${resumeText.slice(0, 3000)}
"""` : `Candidate Preferences:
- Job Type: ${preferences.jobType}
- Experience: ${preferences.experience}
- Skills: ${preferences.skills || "not specified"}
- Location: ${preferences.location || "any"}`}

Rate the match strictly as one of: "High", "Medium", "Low", or "No Opening"

HIGH → Job matches candidate's skills and experience from resume
MEDIUM → Partial match, some skills align
LOW → Job exists but skills/experience don't match well
NO OPENING → No relevant jobs found

Be specific — mention actual job titles found.

Respond ONLY in this JSON format:
{"rating": "High", "reason": "one short sentence mentioning actual job title"}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    console.log("GROQ RESPONSE:", JSON.stringify(data, null, 2));

    const raw = data.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Scan error:", err);
    return NextResponse.json({
      rating: "Low",
      reason: "Could not scan this company's career page.",
    });
  }
}
