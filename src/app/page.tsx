"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import SetSelector from "@/components/SetSelector";
import CardGrid from "@/components/CardGrid";
import SetSummary from "@/components/SetSummary";
import DeckImporter from "@/components/DeckImporter";
import SyncButton from "@/components/SyncButton";
import CurrencyToggle from "@/components/CurrencyToggle";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { Card, DeckCard } from "@/lib/types";
import { DOMAINS, DOMAIN_COLORS, Domain } from "@/lib/domains";
import DeckBuilder, { ImportedDeck } from "@/components/DeckBuilder";

type Tab = "browse" | "deck" | "builder";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [selectedGroupId, setSelectedGroupId] = useState<number | "all" | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [importedDeck, setImportedDeck] = useState<ImportedDeck | null>(null);

  const handleCloneToDeckBuilder = useCallback((name: string, deckCards: DeckCard[]) => {
    const entries = deckCards
      .filter((dc) => dc.matched && dc.card)
      .map((dc) => ({ card: dc.card!, quantity: dc.quantity }));
    setImportedDeck({ name, entries });
    setActiveTab("builder");
  }, []);

  const handleSelectSet = useCallback(async (groupId: number | "all") => {
    setSelectedGroupId(groupId);
    setLoading(true);
    try {
      const res = await fetch(`/api/cards?groupId=${groupId}`);
      const data = await res.json();
      setCards(data.cards || []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleSelectSet("all");
  }, [handleSelectSet]);

  const domains = DOMAINS;

  const filteredCards = useMemo(() => {
    let result = cards;
    if (selectedDomain) {
      result = result.filter((c) => c.domain?.split(";").includes(selectedDomain));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.cleanName.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.rarity?.toLowerCase().includes(q) ||
          c.domain?.toLowerCase().includes(q) ||
          c.cardType?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, search, selectedDomain]);

  return (
    <CurrencyProvider>
    <div className="min-h-screen">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                Riftbound
                <span className="text-accent-400 ml-1">Price Tracker</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                Powered by TCGCSV
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <CurrencyToggle />
              <SyncButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b border-gray-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("browse")}
            className={`pb-2 sm:pb-3 px-1 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "browse"
                ? "border-accent-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Browse Cards
          </button>
          <button
            onClick={() => setActiveTab("builder")}
            className={`pb-2 sm:pb-3 px-1 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "builder"
                ? "border-accent-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Deck Builder
          </button>
          <button
            onClick={() => setActiveTab("deck")}
            className={`pb-2 sm:pb-3 px-1 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "deck"
                ? "border-accent-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Deck Import
          </button>
        </div>

        {activeTab === "browse" && (
          <>
            <div className="mb-6">
              <SetSelector
                selectedGroupId={selectedGroupId}
                onSelect={handleSelectSet}
              />
            </div>

            {selectedGroupId && (
              <div className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, rarity, domain, type..."
                  className="w-full sm:w-80 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:border-accent-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                  {domains.map((d) => {
                    const colors = DOMAIN_COLORS[d as Domain];
                    const active = selectedDomain === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setSelectedDomain(active ? "" : d)}
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
            )}

            <SetSummary cards={filteredCards} groupId={selectedGroupId === "all" ? null : selectedGroupId} />
            <CardGrid cards={filteredCards} loading={loading} />
          </>
        )}

        {activeTab === "builder" && (
          <DeckBuilder
            allCards={cards}
            cardsLoading={loading}
            importedDeck={importedDeck}
            onImportConsumed={() => setImportedDeck(null)}
          />
        )}

        {activeTab === "deck" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">
                Deck Cost Calculator
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Paste your decklist below to calculate the total cost. Use the
                format: quantity cardname (one per line).
              </p>
            </div>
            <DeckImporter onClone={handleCloneToDeckBuilder} />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-600">
          Data sourced from TCGplayer via TCGCSV. Prices update daily.
        </div>
      </footer>
    </div>
    </CurrencyProvider>
  );
}
