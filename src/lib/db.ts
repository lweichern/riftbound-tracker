import { createClient, Client } from "@libsql/client";
import { Card, PriceHistoryEntry } from "./types";

let db: Client | null = null;

function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initializeDb() {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS cards (
      product_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      clean_name TEXT NOT NULL,
      image_url TEXT,
      group_id INTEGER NOT NULL,
      rarity TEXT,
      card_type TEXT,
      number TEXT,
      domain TEXT,
      tcgplayer_url TEXT
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES cards(product_id),
      sub_type TEXT NOT NULL,
      low_price REAL,
      mid_price REAL,
      high_price REAL,
      market_price REAL,
      direct_low_price REAL,
      recorded_at TEXT DEFAULT (date('now')),
      UNIQUE(product_id, sub_type, recorded_at)
    );

    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deck_cards (
      deck_id INTEGER REFERENCES decks(id),
      product_id INTEGER REFERENCES cards(product_id),
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (deck_id, product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_product
      ON price_history(product_id, sub_type);
    CREATE INDEX IF NOT EXISTS idx_price_history_date
      ON price_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_cards_group
      ON cards(group_id);
  `);
}

export async function upsertCards(cards: Card[]) {
  const db = getDb();
  const stmt = `
    INSERT INTO cards (product_id, name, clean_name, image_url, group_id, rarity, card_type, number, domain, tcgplayer_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET
      name = excluded.name,
      clean_name = excluded.clean_name,
      image_url = excluded.image_url,
      rarity = excluded.rarity,
      card_type = excluded.card_type,
      number = excluded.number,
      domain = excluded.domain,
      tcgplayer_url = excluded.tcgplayer_url
  `;

  const batch = cards.map((card) => ({
    sql: stmt,
    args: [
      card.productId,
      card.name,
      card.cleanName,
      card.imageUrl,
      card.groupId,
      card.rarity,
      card.cardType,
      card.number,
      card.domain,
      card.url,
    ],
  }));

  await db.batch(batch);
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
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const stmt = `
    INSERT OR IGNORE INTO price_history (product_id, sub_type, low_price, mid_price, high_price, market_price, direct_low_price, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const batch = snapshots.map((s) => ({
    sql: stmt,
    args: [
      s.productId,
      s.subType,
      s.lowPrice,
      s.midPrice,
      s.highPrice,
      s.marketPrice,
      s.directLowPrice,
      today,
    ],
  }));

  const batchSize = 500;
  for (let i = 0; i < batch.length; i += batchSize) {
    await db.batch(batch.slice(i, i + batchSize));
  }
}

export async function getPriceHistory(
  productId: number,
  subType?: string,
  days: number = 30
): Promise<PriceHistoryEntry[]> {
  const db = getDb();
  const sql = subType
    ? `SELECT * FROM price_history WHERE product_id = ? AND sub_type = ? AND recorded_at >= date('now', '-' || ? || ' days') ORDER BY recorded_at ASC`
    : `SELECT * FROM price_history WHERE product_id = ? AND recorded_at >= date('now', '-' || ? || ' days') ORDER BY recorded_at ASC`;

  const args = subType
    ? [productId, subType, days]
    : [productId, days];

  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    productId: row.product_id as number,
    subType: row.sub_type as string,
    lowPrice: row.low_price as number | null,
    midPrice: row.mid_price as number | null,
    highPrice: row.high_price as number | null,
    marketPrice: row.market_price as number | null,
    directLowPrice: row.direct_low_price as number | null,
    recordedAt: row.recorded_at as string,
  }));
}

export async function saveDeck(
  name: string,
  cards: { productId: number; quantity: number }[]
): Promise<number> {
  const db = getDb();
  const insertDeck = await db.execute({
    sql: "INSERT INTO decks (name) VALUES (?)",
    args: [name],
  });

  const deckId = Number(insertDeck.lastInsertRowid);
  const batch = cards.map((card) => ({
    sql: "INSERT INTO deck_cards (deck_id, product_id, quantity) VALUES (?, ?, ?)",
    args: [deckId, card.productId, card.quantity],
  }));

  await db.batch(batch);
  return deckId;
}

export async function getAllCards(): Promise<
  Array<{ product_id: number; name: string; clean_name: string; group_id: number }>
> {
  const db = getDb();
  const result = await db.execute(
    "SELECT product_id, name, clean_name, group_id FROM cards"
  );
  return result.rows.map((row) => ({
    product_id: row.product_id as number,
    name: row.name as string,
    clean_name: row.clean_name as string,
    group_id: row.group_id as number,
  }));
}
