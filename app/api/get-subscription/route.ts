import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const sub = (await redis.get(`subscription:${email}`)) as any;

    if (sub?.expiresAt && new Date(sub.expiresAt) > new Date()) {
      return NextResponse.json({ plan: "Pro", expiresAt: sub.expiresAt });
    }

    return NextResponse.json({ plan: "Free" });
  } catch (err) {
    return NextResponse.json({ plan: "Free" });
  }
}
