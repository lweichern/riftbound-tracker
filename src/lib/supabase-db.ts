import { getSupabase } from "./supabase";
import { Card, PriceHistoryEntry } from "./types";

export async function upsertCard(card: Card) {
  await getSupabase().from("cards").upsert(
    {
      product_id: card.productId,
      name: card.name,
      clean_name: card.cleanName,
      image_url: card.imageUrl,
      group_id: card.groupId,
      rarity: card.rarity,
      card_type: card.cardType,
      number: card.number,
      domain: card.domain,
      tcgplayer_url: card.url,
    },
    { onConflict: "product_id" }
  );
}

export async function insertPriceSnapshot(
  productId: number,
  subType: string,
  lowPrice: number | null,
  midPrice: number | null,
  highPrice: number | null,
  marketPrice: number | null,
  directLowPrice: number | null
) {
  const today = new Date().toISOString().split("T")[0];

  await getSupabase().from("price_history").upsert(
    {
      product_id: productId,
      sub_type: subType,
      low_price: lowPrice,
      mid_price: midPrice,
      high_price: highPrice,
      market_price: marketPrice,
      direct_low_price: directLowPrice,
      recorded_at: today,
    },
    { onConflict: "product_id,sub_type,recorded_at" }
  );
}

export async function getPriceHistory(
  productId: number,
  subType?: string,
  days: number = 30
): Promise<PriceHistoryEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  let query = getSupabase()
    .from("price_history")
    .select("*")
    .eq("product_id", productId)
    .gte("recorded_at", sinceStr)
    .order("recorded_at", { ascending: true });

  if (subType) {
    query = query.eq("sub_type", subType);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    productId: row.product_id,
    subType: row.sub_type,
    lowPrice: row.low_price,
    midPrice: row.mid_price,
    highPrice: row.high_price,
    marketPrice: row.market_price,
    directLowPrice: row.direct_low_price,
    recordedAt: row.recorded_at,
  }));
}

export async function upsertCards(cards: Card[]) {
  const rows = cards.map((card) => ({
    product_id: card.productId,
    name: card.name,
    clean_name: card.cleanName,
    image_url: card.imageUrl,
    group_id: card.groupId,
    rarity: card.rarity,
    card_type: card.cardType,
    number: card.number,
    domain: card.domain,
    tcgplayer_url: card.url,
  }));

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await getSupabase()
      .from("cards")
      .upsert(batch, { onConflict: "product_id" });
    if (error) throw error;
  }
}

export async function insertPriceSnapshots(
  snapshots: {
    productId: number;
    subType: string;
    lowPrice: number | null;
    midPrice: number | null;
    highPrice: number | null;
    marketPrice: number | null;
    directLowPrice: number | null;
  }[]
) {
  const today = new Date().toISOString().split("T")[0];
  const rows = snapshots.map((s) => ({
    product_id: s.productId,
    sub_type: s.subType,
    low_price: s.lowPrice,
    mid_price: s.midPrice,
    high_price: s.highPrice,
    market_price: s.marketPrice,
    direct_low_price: s.directLowPrice,
    recorded_at: today,
  }));

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await getSupabase()
      .from("price_history")
      .upsert(batch, { onConflict: "product_id,sub_type,recorded_at" });
    if (error) throw error;
  }
}
