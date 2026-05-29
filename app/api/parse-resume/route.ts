import { NextRequest, NextResponse } from "next/server";
const pdf = require("pdf-parse");

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("resume") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdf(buffer);

  return NextResponse.json({ text: data.text });
}