import { NextRequest, NextResponse } from "next/server";
import { getCardsForSet } from "@/lib/tcgcsv";
import { upsertCards, insertPriceSnapshots, initializeDb } from "@/lib/db";
import { RIFTBOUND_SETS } from "@/lib/types";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeDb();
    let totalCards = 0;
    let totalPrices = 0;

    for (const set of RIFTBOUND_SETS) {
      const cards = await getCardsForSet(set.groupId);

      await upsertCards(cards);
      totalCards += cards.length;

      const snapshots = cards.flatMap((card) =>
        card.prices.map((price) => ({
          productId: price.productId,
          subType: price.subTypeName,
          lowPrice: price.lowPrice,
          midPrice: price.midPrice,
          highPrice: price.highPrice,
          marketPrice: price.marketPrice,
          directLowPrice: price.directLowPrice,
        }))
      );

      await insertPriceSnapshots(snapshots);
      totalPrices += snapshots.length;
    }

    return NextResponse.json({
      success: true,
      totalCards,
      totalPrices,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
