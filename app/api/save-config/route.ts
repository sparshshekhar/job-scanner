import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  const config = await req.json();
  const userKey = `scan_config:${config.email}`;
  await redis.set(userKey, config);
  return NextResponse.json({ success: true });
}
