export interface Product {
  productId: number;
  name: string;
  cleanName: string;
  imageUrl: string;
  groupId: number;
  url: string;
  extendedData: { name: string; value: string }[];
}

export interface Price {
  productId: number;
  subTypeName: "Normal" | "Foil";
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
}

export interface Card extends Product {
  rarity: string;
  cardType: string;
  number: string;
  domain: string;
  energyCost: string;
  powerCost: string;
  might: string;
  tag: string;
  description: string;
  prices: Price[];
}

export interface SetGroup {
  groupId: number;
  name: string;
  abbreviation: string;
  main?: boolean;
}

export interface PriceHistoryEntry {
  productId: number;
  subType: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice: number | null;
  recordedAt: string;
}

export interface DeckCardSuggestion {
  productId: number;
  cleanName: string;
  groupId: number;
  rarity: string;
  marketPrice: number | null;
}

export interface DeckCard {
  quantity: number;
  cardName: string;
  matched: boolean;
  card?: Card;
  marketPrice?: number | null;
  suggestions?: DeckCardSuggestion[];
}

export interface Deck {
  id?: number;
  name: string;
  cards: DeckCard[];
  totalCost: number;
  createdAt?: string;
}

export interface SetSummary {
  groupId: number;
  name: string;
  abbreviation: string;
  cardCount: number;
  normalTotal: number;
  foilTotal: number;
}

export const RIFTBOUND_SETS: SetGroup[] = [
  { groupId: 24344, name: "Origins", abbreviation: "OGN", main: true },
  { groupId: 24519, name: "Spiritforged", abbreviation: "SFD", main: true },
  { groupId: 24560, name: "Unleashed", abbreviation: "UNL", main: true },
  { groupId: 24439, name: "Origins: Proving Grounds", abbreviation: "OGS" },
  { groupId: 24552, name: "Judge Promotional Cards", abbreviation: "JDG" },
  { groupId: 24528, name: "Organized Play Promotional Cards", abbreviation: "OPP" },
  { groupId: 24343, name: "Riftbound Promotional Cards", abbreviation: "PR" },
  { groupId: 24502, name: "Riftbound Worlds Bundle 2025", abbreviation: "RWB" },
];
