"use client";

import React, { useState } from "react";
import { DeckCard, DeckCardSuggestion, RIFTBOUND_SETS } from "@/lib/types";
import { useCurrency } from "./CurrencyContext";

interface DeckImporterProps {
  onClone?: (name: string, cards: DeckCard[]) => void;
}

export default function DeckImporter({ onClone }: DeckImporterProps) {
  const { formatPrice } = useCurrency();
  const [deckList, setDeckList] = useState("");
  const [deckName, setDeckName] = useState("");
  const [result, setResult] = useState<{
    name: string;
    cards: DeckCard[];
    totalCost: number;
    unmatchedCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  async function handleImport() {
    if (!deckList.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    setExpandedRow(null);

    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckList, name: deckName || "Imported Deck" }),
      });

      if (!res.ok) throw new Error("Import failed");

      const data = await res.json();
      setResult(data);
    } catch {
      setError("Failed to import deck. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleReplace(index: number, suggestion: DeckCardSuggestion) {
    if (!result || !suggestion) return;

    const updatedCards = [...result.cards];
    updatedCards[index] = {
      ...updatedCards[index],
      matched: true,
      card: { ...updatedCards[index].card!, productId: suggestion.productId, cleanName: suggestion.cleanName, groupId: suggestion.groupId, rarity: suggestion.rarity } as DeckCard["card"],
      marketPrice: suggestion.marketPrice,
      suggestions: undefined,
    };

    const newTotalCost = updatedCards.reduce((sum, c) => {
      if (c.matched && c.marketPrice != null) return sum + c.marketPrice * c.quantity;
      return sum;
    }, 0);

    setResult({
      ...result,
      cards: updatedCards,
      totalCost: newTotalCost,
      unmatchedCount: updatedCards.filter((c) => !c.matched).length,
    });
    setExpandedRow(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Deck Name
        </label>
        <input
          type="text"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="My Deck"
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Deck List
        </label>
        <textarea
          value={deckList}
          onChange={(e) => setDeckList(e.target.value)}
          placeholder={"4 Flamecaller\n3 Shadow Weaver\n2 Arcane Sentinel\n1 Rift Dragon"}
          rows={10}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-accent-500 focus:outline-none resize-y"
        />
        <p className="text-xs text-gray-500 mt-1">
          Format: quantity cardname (one per line)
        </p>
      </div>

      <button
        onClick={handleImport}
        disabled={loading || !deckList.trim()}
        className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
      >
        {loading ? "Importing..." : "Calculate Deck Cost"}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{result.name}</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-accent-400">
                {formatPrice(result.totalCost)}
              </div>
              <div className="text-xs text-gray-400">total estimated cost</div>
            </div>
          </div>

          {result.unmatchedCount > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-400 rounded-lg p-3 text-sm">
              {result.unmatchedCount} card(s) could not be matched — click to pick a replacement
            </div>
          )}

          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-100">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-2 sm:px-4 py-2 text-gray-400 font-medium text-xs sm:text-sm">Qty</th>
                  <th className="text-left px-2 sm:px-4 py-2 text-gray-400 font-medium text-xs sm:text-sm">Card</th>
                  <th className="text-right px-2 sm:px-4 py-2 text-gray-400 font-medium text-xs sm:text-sm">Price</th>
                  <th className="text-right px-2 sm:px-4 py-2 text-gray-400 font-medium text-xs sm:text-sm">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {result.cards.map((entry, i) => (
                  <React.Fragment key={i}>
                    <tr
                      className={`border-b border-gray-700/50 ${
                        !entry.matched ? "bg-yellow-900/10 cursor-pointer hover:bg-yellow-900/20" : ""
                      }`}
                      onClick={!entry.matched && entry.suggestions?.length ? () => setExpandedRow(expandedRow === i ? null : i) : undefined}
                    >
                      <td className="px-2 sm:px-4 py-2 text-gray-300 text-xs sm:text-sm">{entry.quantity}x</td>
                      <td className="px-2 sm:px-4 py-2">
                        {entry.matched ? (
                          <span className="text-white text-xs sm:text-sm">
                            {entry.card?.cleanName}
                          </span>
                        ) : (
                          <span className="text-yellow-400 text-xs sm:text-sm">
                            {entry.cardName}{" "}
                            <span className="text-xs">(not found{entry.suggestions?.length ? " — tap to replace" : ""})</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right text-gray-300 text-xs sm:text-sm">
                        {entry.matched ? formatPrice(entry.marketPrice ?? null) : "—"}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right text-white font-medium text-xs sm:text-sm">
                        {entry.matched && entry.marketPrice != null
                          ? formatPrice(entry.marketPrice * entry.quantity)
                          : "—"}
                      </td>
                    </tr>
                    {expandedRow === i && entry.suggestions && entry.suggestions.length > 0 && (
                      <tr key={`${i}-suggestions`} className="border-b border-gray-700/50">
                        <td colSpan={4} className="px-2 sm:px-4 py-2 bg-gray-900/50">
                          <p className="text-xs text-gray-400 mb-2">Did you mean:</p>
                          <div className="space-y-1">
                            {entry.suggestions.map((s) => {
                              const setAbbr = RIFTBOUND_SETS.find((set) => set.groupId === s.groupId)?.abbreviation || "";
                              return (
                                <button
                                  key={s.productId}
                                  onClick={(e) => { e.stopPropagation(); handleReplace(i, s); }}
                                  className="w-full flex items-center justify-between px-2 sm:px-3 py-2 sm:py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                    <span className="text-xs sm:text-sm text-white truncate">{s.cleanName}</span>
                                    <span className="text-xs text-gray-500 shrink-0">{setAbbr}</span>
                                    <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">{s.rarity}</span>
                                  </div>
                                  <span className="text-xs sm:text-sm text-green-400 font-medium shrink-0 ml-2">
                                    {formatPrice(s.marketPrice)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {onClone && (
            <button
              onClick={() => onClone(result.name, result.cards)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Clone to Deck Builder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
