import { NextResponse } from "next/server";

let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ rate: cachedRate.rate });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    const rate = data.rates?.MYR;

    if (typeof rate !== "number") {
      return NextResponse.json({ error: "MYR rate not found" }, { status: 502 });
    }

    cachedRate = { rate, fetchedAt: Date.now() };
    return NextResponse.json({ rate });
  } catch {
    return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 502 });
  }
}
