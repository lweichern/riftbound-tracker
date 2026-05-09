import { Product, Price, Card } from "./types";

const BASE_URL = "https://tcgcsv.com/tcgplayer";
const CATEGORY_ID = 89;
const USER_AGENT = "RiftboundTracker/1.0";

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 100) {
    await new Promise((r) => setTimeout(r, 100 - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TCGCSV API error: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function getLastUpdated(): Promise<string> {
  const res = await rateLimitedFetch(`${BASE_URL}/last-updated.txt`);
  return res.text();
}

export async function getProducts(groupId: number): Promise<Product[]> {
  const res = await rateLimitedFetch(
    `${BASE_URL}/${CATEGORY_ID}/${groupId}/products`
  );
  const data = await res.json();
  return data.results || [];
}

export async function getPrices(groupId: number): Promise<Price[]> {
  const res = await rateLimitedFetch(
    `${BASE_URL}/${CATEGORY_ID}/${groupId}/prices`
  );
  const data = await res.json();
  return data.results || [];
}

function extractField(product: Product, fieldName: string): string {
  const field = product.extendedData?.find((d) => d.name === fieldName);
  return field?.value || "";
}

export async function getCardsForSet(groupId: number): Promise<Card[]> {
  const [products, prices] = await Promise.all([
    getProducts(groupId),
    getPrices(groupId),
  ]);

  const priceMap = new Map<number, Price[]>();
  for (const price of prices) {
    const existing = priceMap.get(price.productId) || [];
    existing.push(price);
    priceMap.set(price.productId, existing);
  }

  return products.map((product) => ({
    ...product,
    rarity: extractField(product, "Rarity"),
    cardType: extractField(product, "Card Type"),
    number: extractField(product, "Number"),
    domain: extractField(product, "Domain"),
    energyCost: extractField(product, "Energy Cost"),
    powerCost: extractField(product, "Power Cost"),
    might: extractField(product, "Might"),
    tag: extractField(product, "Tag"),
    description: extractField(product, "Description"),
    prices: priceMap.get(product.productId) || [],
  }));
}

export function getDisplayPrice(card: Card, subType?: string): number | null {
  const prices = subType
    ? card.prices.filter((p) => p.subTypeName === subType)
    : card.prices;

  for (const p of prices) {
    if (p.marketPrice != null) return p.marketPrice;
    if (p.midPrice != null) return p.midPrice;
  }
  return null;
}
