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
  const { company, preferences } = await req.json();

  const pageText = await fetchPageText(company.url);

  const prompt = `You are a strict job match analyzer. You will be given the content of a company's career page and a candidate's preferences. Your job is to carefully analyze and rate the match.

Company: ${company.name}
Career Page Content:
"""
${pageText}
"""

Candidate preferences:
- Job Type: ${preferences.jobType}
- Experience Level: ${preferences.experience}
- Skills: ${preferences.skills || "not specified"}
- Location: ${preferences.location || "any"}

Follow these strict rules to rate:

HIGH → Only if you find a job that:
  1. Matches the exact job type (e.g. AI/ML, Full Stack)
  2. Matches the experience level (e.g. 0-1 years = fresher/junior/entry-level)
  3. At least 1 required skill matches
  
MEDIUM → If you find a job that:
  1. Matches the job type BUT experience required is higher (e.g. needs 2-3 years)
  2. OR matches experience but role is slightly different (adjacent role)

LOW → If:
  1. Company has openings but none related to the job type at all
  2. OR page loaded but job details are too vague to confirm

NO OPENING → Only if:
  1. No jobs found on the page at all
  2. OR career page clearly says no current openings

Do NOT guess. If you are unsure, pick LOW over HIGH.
Be specific in your reason — mention the actual job title you found if possible.

Respond ONLY in this exact JSON format:
{"rating": "High", "reason": "Found 'Junior ML Engineer' role requiring Python and 0-2 years experience"}`;

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
