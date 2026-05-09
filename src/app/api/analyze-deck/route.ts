import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface DeckCardInput {
  name: string;
  quantity: number;
  domain: string;
  cardType: string;
  energyCost: string;
  powerCost: string;
  might: string;
  description: string;
  rarity: string;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { deckName, cards } = (await request.json()) as {
      deckName: string;
      cards: DeckCardInput[];
    };

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { error: "Deck is empty" },
        { status: 400 }
      );
    }

    const cardList = cards
      .map(
        (c) =>
          `${c.quantity}x ${c.name} [${c.domain || "No Domain"}] (${c.cardType}, Energy: ${c.energyCost || "—"}, Power: ${c.powerCost || "—"}, Might: ${c.might || "—"}, Rarity: ${c.rarity})\n  Effect: ${c.description || "No description"}`
      )
      .join("\n\n");

    const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
    const domains = [...new Set(cards.flatMap((c) => c.domain?.split(";") || []).filter(Boolean))];

    const prompt = `You are an expert Riftbound TCG analyst. Riftbound is a League of Legends trading card game with 6 domains: Fury (red, aggro), Calm (green, control/tricks), Mind (blue, card advantage/planning), Body (orange, ramp/big units), Chaos (purple, recursion/disruption), and Order (yellow, go-wide/tokens/sacrifice).

Analyze this deck:

Deck Name: ${deckName}
Total Cards: ${totalCards}
Domains: ${domains.join(", ")}

--- CARD LIST ---
${cardList}
--- END CARD LIST ---

Provide a structured analysis with these sections:

## Overview
A 2-3 sentence summary of the deck's strategy and identity.

## Strengths
3-4 bullet points on what this deck does well, referencing specific cards.

## Weaknesses
3-4 bullet points on vulnerabilities, referencing specific cards or missing elements.

## Key Synergies
2-3 notable card combinations or synergies in the deck.

## Favorable Matchups
2-3 specific deck archetypes this deck should perform well against. Name them by their champion/leader (e.g. "Darius Aggro", "Fiora Body Midrange", "Irelia Order Go-Wide") and explain why this deck has the advantage.

## Unfavorable Matchups
2-3 specific deck archetypes this deck would struggle against. Name them by their champion/leader (e.g. "Viktor Mind Control", "Jinx Chaos Burn", "Lee Sin Calm Combo") and explain why they're problematic.

## Suggestions
2-3 concrete suggestions to improve the deck (cards to add/remove or ratio changes).

Be specific, reference actual cards in the deck, and keep the analysis concise but insightful.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Deck analysis failed:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
