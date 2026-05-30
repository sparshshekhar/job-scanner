import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function extractSheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  const { sheetUrl, results } = await req.json();

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    return NextResponse.json({ error: "Invalid sheet URL" }, { status: 400 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Add header row + results
    const values = [
      ["Company", "Career URL", "Rating", "Reason", "Scanned At"],
      ...results.map((r: any) => [
        r.company,
        r.url,
        r.rating,
        r.reason,
        new Date().toLocaleString("en-IN"),
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Write sheet error:", err);
    return NextResponse.json({ error: "Failed to write to sheet" }, { status: 500 });
  }
}