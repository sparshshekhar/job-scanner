import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  // Upstash auto-parses JSON so no need for JSON.parse
  const results = (await redis.get(`results:${email}`)) as any[];
  const statusKeys = await redis.keys(`status:${email}:*`);

  const statusMap: Record<string, string> = {};
  for (const key of statusKeys) {
    const company = key.replace(`status:${email}:`, "");
    const status = (await redis.get(key)) as string;
    statusMap[company] = status;
  }

  return NextResponse.json({
    results: results || [],
    statuses: statusMap,
  });
}
