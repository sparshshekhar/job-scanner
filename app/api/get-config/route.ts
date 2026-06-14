import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const config = await redis.get(`scan_config:${email}`);
    return NextResponse.json({ config: config || null });
  } catch (err) {
    return NextResponse.json({ config: null });
  }
}
