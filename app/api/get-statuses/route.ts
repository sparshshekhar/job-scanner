import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  const keys = await redis.keys(`status:${email}:*`);

  const statuses: Record<string, string> = {};
  for (const key of keys) {
    const company = key.replace(`status:${email}:`, "");
    const status = (await redis.get(key)) as string;
    statuses[company] = status;
  }

  return NextResponse.json({ statuses });
}
