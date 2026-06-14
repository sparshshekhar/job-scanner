import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  const { email, results } = await req.json();
  await redis.set(`results:${email}`, JSON.stringify(results));
  return NextResponse.json({ success: true });
}
