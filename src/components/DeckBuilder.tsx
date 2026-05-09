"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, RIFTBOUND_SETS } from "@/lib/types";
import { DOMAINS, DOMAIN_COLORS, Domain } from "@/lib/domains";
import { useCurrency } from "./CurrencyContext";

export interface DeckEntry {
  card: Card;
  quantity: number;
}

export interface ImportedDeck {
  name: string;
  entries: DeckEntry[];
}

function getPrice(card: Card): number | null {
  for (const p of card.prices) {
    if (p.marketPrice != null) return p.marketPrice;
    if (p.midPrice != null) return p.midPrice;
  }
  return null;
}

function getRarityColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case "mythic":
      return "text-orange-400";
    case "rare":
      return "text-yellow-400";
    case "uncommon":
      return "text-blue-400";
    case "common":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

interface DeckBuilderProps {
  allCards: Card[];
  cardsLoading: boolean;
  importedDeck?: ImportedDeck | null;
  onImportConsumed?: () => void;
}

export default function DeckBuilder({ allCards, cardsLoading, importedDeck, onImportConsumed }: DeckBuilderProps) {
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [deckName, setDeckName] = useState("My Deck");
  const [deck, setDeck] = useState<DeckEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [ownCards, setOwnCards] = useState<Card[]>([]);
  const [ownLoading, setOwnLoading] = useState(false);
  const [hoveredEntry, setHoveredEntry] = useState<DeckEntry | null>(null);

  useEffect(() => {
    setOwnLoading(true);
    fetch("/api/cards?groupId=all")
      .then((res) => res.json())
      .then((data) => setOwnCards(data.cards || []))
      .catch(() => {})
      .finally(() => setOwnLoading(false));
  }, []);

  const cards = ownCards;
  const isLoading = ownLoading;

  useEffect(() => {
    if (importedDeck) {
      setDeckName(importedDeck.name);
      setDeck(importedDeck.entries);
      onImportConsumed?.();
    }
  }, [importedDeck, onImportConsumed]);

  const searchResults = useMemo(() => {
    if (!search.trim() && !domainFilter) return [];
    let results = cards;
    if (domainFilter) {
      results = results.filter((c) => c.domain?.split(";").includes(domainFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.cleanName.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.cardType?.toLowerCase().includes(q)
      );
    }
    return results.slice(0, 40);
  }, [cards, search, domainFilter]);

  const addCard = useCallback((card: Card) => {
    setDeck((prev) => {
      const existing = prev.find((e) => e.card.productId === card.productId);
      if (existing) {
        return prev.map((e) =>
          e.card.productId === card.productId
            ? { ...e, quantity: e.quantity + 1 }
            : e
        );
      }
      return [...prev, { card, quantity: 1 }];
    });
  }, []);

  const removeCard = useCallback((productId: number) => {
    setDeck((prev) => prev.filter((e) => e.card.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setDeck((prev) =>
      prev
        .map((e) =>
          e.card.productId === productId
            ? { ...e, quantity: Math.max(0, e.quantity + delta) }
            : e
        )
        .filter((e) => e.quantity > 0)
    );
  }, []);

  const totalCards = deck.reduce((sum, e) => sum + e.quantity, 0);
  const totalCost = deck.reduce((sum, e) => {
    const price = getPrice(e.card);
    return sum + (price ?? 0) * e.quantity;
  }, 0);

  const exportDeck = useCallback(() => {
    const setMap = new Map(RIFTBOUND_SETS.map((s) => [s.groupId, s.abbreviation]));
    const lines = deck.map((e) => {
      const abbr = setMap.get(e.card.groupId) || "???";
      const num = e.card.number ? `-${e.card.number}` : "";
      return `${e.quantity} ${e.card.cleanName} (${abbr}${num})`;
    });
    return `${deckName}\n\n${lines.join("\n")}`;
  }, [deck, deckName]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportDeck());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportDeck]);

  const clearDeck = useCallback(() => {
    setDeck([]);
    setAnalysis("");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (deck.length === 0) return;
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysis("");
    try {
      const cards = deck.map((e) => ({
        name: e.card.cleanName,
        quantity: e.quantity,
        domain: e.card.domain,
        cardType: e.card.cardType,
        energyCost: e.card.energyCost,
        powerCost: e.card.powerCost,
        might: e.card.might,
        description: e.card.description,
        rarity: e.card.rarity,
      }));
      const res = await fetch("/api/analyze-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckName, cards }),
      });
      const data = await res.json();
      if (data.error) {
        setAnalysisError(data.error);
      } else {
        setAnalysis(data.analysis);
      }
    } catch {
      setAnalysisError("Failed to analyze deck. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }, [deck, deckName]);

  function renderInline(text: string) {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
      {/* Card Search Panel */}
      <div className="flex-1 min-w-0">
        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards to add..."
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:border-accent-500 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {DOMAINS.map((d) => {
              const colors = DOMAIN_COLORS[d as Domain];
              const active = domainFilter === d;
              return (
                <button
                  key={d}
                  onClick={() => setDomainFilter(active ? "" : d)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}`
                      : "bg-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {hoveredEntry && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4 flex gap-4">
            <div className="w-36 sm:w-44 shrink-0">
              <div className="aspect-5/7 relative bg-gray-900 rounded-lg overflow-hidden">
                {hoveredEntry.card.imageUrl ? (
                  <img
                    src={hoveredEntry.card.imageUrl}
                    alt={hoveredEntry.card.cleanName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Image</div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h4 className="text-base font-bold text-white">{hoveredEntry.card.cleanName}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-medium ${getRarityColor(hoveredEntry.card.rarity)}`}>{hoveredEntry.card.rarity}</span>
                  <span className="text-xs text-gray-500">{hoveredEntry.card.cardType}</span>
                  {hoveredEntry.card.domain && (
                    <div className="flex items-center gap-1">
                      {hoveredEntry.card.domain.split(";").map((d) => {
                        const colors = DOMAIN_COLORS[d as Domain];
                        return colors ? (
                          <span key={d} className="flex items-center gap-0.5">
                            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            <span className={`text-xs ${colors.text}`}>{d}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {hoveredEntry.card.energyCost && (
                  <div><span className="text-gray-500">Energy:</span> <span className="text-white">{hoveredEntry.card.energyCost}</span></div>
                )}
                {hoveredEntry.card.powerCost && (
                  <div><span className="text-gray-500">Power:</span> <span className="text-white">{hoveredEntry.card.powerCost}</span></div>
                )}
                {hoveredEntry.card.might && (
                  <div><span className="text-gray-500">Might:</span> <span className="text-white">{hoveredEntry.card.might}</span></div>
                )}
              </div>
              {hoveredEntry.card.description && (
                <p className="text-xs text-gray-400 italic leading-relaxed">{hoveredEntry.card.description}</p>
              )}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm font-semibold text-accent-400">x{hoveredEntry.quantity}</span>
                <span className="text-sm text-green-400 font-medium">{formatPrice(getPrice(hoveredEntry.card))}</span>
                <span className="text-xs text-gray-500">({formatPrice((getPrice(hoveredEntry.card) ?? 0) * hoveredEntry.quantity)} total)</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
          </div>
        )}

        {!isLoading && !search.trim() && !domainFilter && !hoveredEntry && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Search for cards to add to your deck
          </div>
        )}

        {!isLoading && (search.trim() || domainFilter) && searchResults.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No cards found
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-1">
            {searchResults.map((card) => {
              const price = getPrice(card);
              const inDeck = deck.find((e) => e.card.productId === card.productId);
              const setName = RIFTBOUND_SETS.find((s) => s.groupId === card.groupId)?.abbreviation || "";
              return (
                <button
                  key={card.productId}
                  onClick={() => addCard(card)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-left group"
                >
                  <div className="w-8 h-11 shrink-0 rounded overflow-hidden bg-gray-900 hidden sm:block">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white truncate">{card.cleanName}</span>
                      {card.domain && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {card.domain.split(";").map((d) => {
                            const colors = DOMAIN_COLORS[d as Domain];
                            return colors ? (
                              <span key={d} className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={getRarityColor(card.rarity)}>{card.rarity}</span>
                      <span className="text-gray-500">{setName}</span>
                      {card.number && <span className="text-gray-600">#{card.number}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <span className="text-xs sm:text-sm text-green-400 font-medium">
                      {formatPrice(price)}
                    </span>
                    {inDeck && (
                      <span className="text-xs text-accent-400 bg-accent-500/15 px-1.5 py-0.5 rounded">
                        x{inDeck.quantity}
                      </span>
                    )}
                    <span className="text-gray-600 group-hover:text-accent-400 transition-colors text-lg">+</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Deck Panel */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-3">
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="bg-transparent text-white font-semibold text-sm border-b border-transparent hover:border-gray-600 focus:border-accent-500 focus:outline-none w-full mr-2"
            />
            {deck.length > 0 && (
              <button
                onClick={clearDeck}
                className="text-xs text-gray-500 hover:text-red-400 flex-shrink-0 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
            <span>{totalCards} cards</span>
            <span className="text-accent-400 font-semibold text-base">
              {formatPrice(totalCost)}
            </span>
          </div>

          {deck.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              Click cards to add them here
            </div>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {deck.map((entry) => {
                const price = getPrice(entry.card);
                return (
                  <div
                    key={entry.card.productId}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-700/50 group cursor-pointer"
                    onMouseEnter={() => setHoveredEntry(entry)}
                    onMouseLeave={() => setHoveredEntry(null)}
                    onClick={() => setHoveredEntry(hoveredEntry?.card.productId === entry.card.productId ? null : entry)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {entry.card.domain && (
                          <div className="flex gap-0.5">
                            {entry.card.domain.split(";").map((d) => {
                              const colors = DOMAIN_COLORS[d as Domain];
                              return colors ? (
                                <span key={d} className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                              ) : null;
                            })}
                          </div>
                        )}
                        <span className="text-xs text-white truncate">{entry.card.cleanName}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatPrice(price)} ea
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(entry.card.productId, -1)}
                        className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-gray-600 text-sm sm:text-xs transition-colors"
                      >
                        -
                      </button>
                      <span className="text-xs text-white w-5 sm:w-4 text-center">{entry.quantity}</span>
                      <button
                        onClick={() => updateQuantity(entry.card.productId, 1)}
                        className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-gray-600 text-sm sm:text-xs transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeCard(entry.card.productId)}
                        className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-600 text-sm sm:text-xs ml-0.5 sm:ml-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      >
                        x
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {deck.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700 space-y-2">
              <button
                onClick={handleCopy}
                className="w-full px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {copied ? "Copied!" : "Copy Deck List"}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {analyzing ? "Analyzing..." : "AI Deck Analysis"}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {analysisError && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg p-3 text-sm">
          {analysisError}
        </div>
      )}

      {analyzing && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Analyzing your deck...</p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">AI Analysis</h3>
            <button
              onClick={() => setAnalysis("")}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-gray-300 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:space-y-1 [&_li]:text-gray-300 [&_strong]:text-white">
            {analysis.split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return <h2 key={i}>{renderInline(line.replace("## ", ""))}</h2>;
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return <p key={i} className="pl-3 border-l-2 border-gray-700 text-sm my-1">{renderInline(line.replace(/^[-*] /, ""))}</p>;
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i} className="text-sm">{renderInline(line)}</p>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
