import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const order = await razorpay.orders.create({
      amount: 29900, // ₹299 in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    return NextResponse.json(order);
  } catch (err) {
    console.error("Order error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
