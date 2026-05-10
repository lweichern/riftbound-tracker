import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/db";

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  const subType = request.nextUrl.searchParams.get("subType");
  const days = request.nextUrl.searchParams.get("days");

  if (!productId) {
    return NextResponse.json(
      { error: "productId parameter is required" },
      { status: 400 }
    );
  }

  try {
    const history = await getPriceHistory(
      parseInt(productId, 10),
      subType || undefined,
      days ? parseInt(days, 10) : 30
    );
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to fetch price history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
