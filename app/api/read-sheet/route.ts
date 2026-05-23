import { NextRequest, NextResponse } from "next/server";

function extractSheetId(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  const { sheetUrl } = await req.json();

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    return NextResponse.json(
      { error: "Invalid Google Sheet URL" },
      { status: 400 },
    );
  }

  // Google's public JSON endpoint — no API key needed for public sheets
  const fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  const res = await fetch(fetchUrl);
  const text = await res.text();

  // Google wraps the JSON in a callback, we need to strip it
  const json = JSON.parse(text.substring(47).slice(0, -2));

  const rows = json.table.rows;

  const companies = rows
    .map((row: any) => ({
      name: row.c[0]?.v?.toString().trim() || "",
      url: row.c[1]?.v?.toString().trim() || "",
    }))
    .filter((c: any) => c.name && c.url); // skip empty rows

  return NextResponse.json({ companies });
}
