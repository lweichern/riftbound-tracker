import Database from "better-sqlite3";
import path from "path";
import { Card, PriceHistoryEntry } from "./types";

const DB_PATH = path.join(process.cwd(), "riftbound.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
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

export function upsertCard(card: Card) {
  const db = getDb();
  db.prepare(`
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
  `).run(
    card.productId,
    card.name,
    card.cleanName,
    card.imageUrl,
    card.groupId,
    card.rarity,
    card.cardType,
    card.number,
    card.domain,
    card.url
  );
}

export function insertPriceSnapshot(
  productId: number,
  subType: string,
  lowPrice: number | null,
  midPrice: number | null,
  highPrice: number | null,
  marketPrice: number | null,
  directLowPrice: number | null
) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO price_history (product_id, sub_type, low_price, mid_price, high_price, market_price, direct_low_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(productId, subType, lowPrice, midPrice, highPrice, marketPrice, directLowPrice);
}

export function getPriceHistory(
  productId: number,
  subType?: string,
  days: number = 30
): PriceHistoryEntry[] {
  const db = getDb();
  const query = subType
    ? `SELECT * FROM price_history WHERE product_id = ? AND sub_type = ? AND recorded_at >= date('now', '-${days} days') ORDER BY recorded_at ASC`
    : `SELECT * FROM price_history WHERE product_id = ? AND recorded_at >= date('now', '-${days} days') ORDER BY recorded_at ASC`;

  const rows = subType
    ? db.prepare(query).all(productId, subType)
    : db.prepare(query).all(productId);

  return (rows as Array<Record<string, unknown>>).map((row) => ({
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

export function saveDeck(name: string, cards: { productId: number; quantity: number }[]): number {
  const db = getDb();
  const insertDeck = db.prepare("INSERT INTO decks (name) VALUES (?)");
  const insertCard = db.prepare(
    "INSERT INTO deck_cards (deck_id, product_id, quantity) VALUES (?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    const result = insertDeck.run(name);
    const deckId = result.lastInsertRowid as number;
    for (const card of cards) {
      insertCard.run(deckId, card.productId, card.quantity);
    }
    return deckId;
  });

  return transaction();
}

export function getAllCards(): Array<{ product_id: number; name: string; clean_name: string; group_id: number }> {
  const db = getDb();
  return db.prepare("SELECT product_id, name, clean_name, group_id FROM cards").all() as Array<{
    product_id: number;
    name: string;
    clean_name: string;
    group_id: number;
  }>;
}
