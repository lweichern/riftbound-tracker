import { NextRequest, NextResponse } from "next/server";
import { getCardsForSet } from "@/lib/tcgcsv";
import { RIFTBOUND_SETS } from "@/lib/types";

export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId");

  if (groupId === "all") {
    try {
      const results = await Promise.all(
        RIFTBOUND_SETS.map((s) => getCardsForSet(s.groupId))
      );
      return NextResponse.json({ cards: results.flat() });
    } catch (error) {
      console.error("Failed to fetch all cards:", error);
      return NextResponse.json(
        { error: "Failed to fetch cards" },
        { status: 500 }
      );
    }
  }

  if (!groupId) {
    return NextResponse.json(
      { error: "groupId parameter is required" },
      { status: 400 }
    );
  }

  const gid = parseInt(groupId, 10);
  if (!RIFTBOUND_SETS.some((s) => s.groupId === gid)) {
    return NextResponse.json(
      { error: "Invalid groupId" },
      { status: 400 }
    );
  }

  try {
    const cards = await getCardsForSet(gid);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Failed to fetch cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch cards" },
      { status: 500 }
    );
  }
}
