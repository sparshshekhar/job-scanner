import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  const { email, company, status } = await req.json();
  await redis.set(`status:${email}:${company}`, status);
  return NextResponse.json({ success: true });
}
