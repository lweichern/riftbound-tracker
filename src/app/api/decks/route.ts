import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { getCardsForSet, getDisplayPrice } from "@/lib/tcgcsv";
import { RIFTBOUND_SETS, Card, DeckCard } from "@/lib/types";

function parseDeckList(text: string): { quantity: number; cardName: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("#"))
    .map((line) => {
      const cleaned = line
        .replace(/\s*\([A-Z]{2,4}-[\dA-Za-z]+\)\s*$/, "")
        .replace(/\s*-\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const match = cleaned.match(/^(\d+)\s+(.+)$/);
      if (match) {
        return { quantity: parseInt(match[1], 10), cardName: match[2].trim() };
      }
      return { quantity: 1, cardName: cleaned };
    });
}

export async function POST(request: NextRequest) {
  try {
    const { deckList, name } = await request.json();

    if (!deckList || typeof deckList !== "string") {
      return NextResponse.json(
        { error: "deckList (string) is required" },
        { status: 400 }
      );
    }

    const allCards: Card[] = [];
    for (const set of RIFTBOUND_SETS) {
      const cards = await getCardsForSet(set.groupId);
      allCards.push(...cards);
    }

    const fuse = new Fuse(allCards, {
      keys: ["cleanName", "name"],
      threshold: 0.4,
      includeScore: true,
    });

    const entries = parseDeckList(deckList);
    let totalCost = 0;

    const deckCards: DeckCard[] = entries.map((entry) => {
      const results = fuse.search(entry.cardName);
      if (results.length > 0) {
        const card = results[0].item;
        const price = getDisplayPrice(card);
        const lineCost = price ? price * entry.quantity : 0;
        totalCost += lineCost;
        return {
          quantity: entry.quantity,
          cardName: entry.cardName,
          matched: true,
          card,
          marketPrice: price,
        };
      }
      const looseFuse = new Fuse(allCards, {
        keys: ["cleanName", "name"],
        threshold: 0.6,
        includeScore: true,
      });
      const suggestions = looseFuse
        .search(entry.cardName)
        .slice(0, 5)
        .map((r) => ({
          productId: r.item.productId,
          cleanName: r.item.cleanName,
          groupId: r.item.groupId,
          rarity: r.item.rarity,
          marketPrice: getDisplayPrice(r.item),
        }));

      return {
        quantity: entry.quantity,
        cardName: entry.cardName,
        matched: false,
        suggestions,
      };
    });

    return NextResponse.json({
      name: name || "Imported Deck",
      cards: deckCards,
      totalCost,
      unmatchedCount: deckCards.filter((c) => !c.matched).length,
    });
  } catch (error) {
    console.error("Deck import failed:", error);
    return NextResponse.json(
      { error: "Deck import failed" },
      { status: 500 }
    );
  }
}
