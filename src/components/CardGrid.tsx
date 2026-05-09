"use client";

import { Card } from "@/lib/types";
import { useState } from "react";
import PriceChartModal from "./PriceChartModal";
import { useCurrency } from "./CurrencyContext";
import { DOMAIN_COLORS, Domain } from "@/lib/domains";

interface CardGridProps {
  cards: Card[];
  loading: boolean;
}

function getPrice(card: Card, subType?: string): number | null {
  const prices = subType
    ? card.prices.filter((p) => p.subTypeName === subType)
    : card.prices;
  for (const p of prices) {
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

type SortKey = "price-desc" | "price-asc" | "name" | "rarity" | "number";

export default function CardGrid({ cards, loading }: CardGridProps) {
  const [sortBy, setSortBy] = useState<SortKey>("price-desc");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { formatPrice } = useCurrency();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        Select a set to browse cards
      </div>
    );
  }

  const sorted = [...cards].sort((a, b) => {
    switch (sortBy) {
      case "price-desc":
        return (getPrice(b) ?? -1) - (getPrice(a) ?? -1);
      case "price-asc":
        return (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity);
      case "name":
        return a.cleanName.localeCompare(b.cleanName);
      case "rarity": {
        const order: Record<string, number> = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
        return (order[a.rarity?.toLowerCase()] ?? 4) - (order[b.rarity?.toLowerCase()] ?? 4);
      }
      case "number":
        return (parseInt(a.number) || 0) - (parseInt(b.number) || 0);
      default:
        return 0;
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="text-xs sm:text-sm text-gray-400">{cards.length} cards</p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="bg-gray-800 text-gray-300 text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1.5 border border-gray-700 focus:border-accent-500 focus:outline-none"
        >
          <option value="price-desc">Price: High → Low</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="name">Name</option>
          <option value="rarity">Rarity</option>
          <option value="number">Card Number</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
        {sorted.map((card) => {
          const normalPrice = getPrice(card, "Normal");
          const foilPrice = getPrice(card, "Foil");
          return (
            <div
              key={card.productId}
              className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-accent-500 transition-all cursor-pointer group"
              onClick={() => setSelectedCard(card)}
            >
              <div className="aspect-[5/7] relative bg-gray-900">
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.cleanName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      target.parentElement!.querySelector("[data-placeholder]")!.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div data-placeholder className={`w-full h-full flex items-center justify-center text-gray-600 text-xs px-2 text-center ${card.imageUrl ? "hidden" : ""}`}>
                  No Image
                </div>
              </div>
              <div className="p-2.5">
                <h3 className="text-sm font-medium text-white truncate" title={card.cleanName}>
                  {card.cleanName}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${getRarityColor(card.rarity)}`}>
                      {card.rarity || "—"}
                    </span>
                    {card.domain && (
                      <div className="flex gap-0.5">
                        {card.domain.split(";").map((d) => {
                          const colors = DOMAIN_COLORS[d as Domain];
                          return colors ? (
                            <span key={d} className={`w-2 h-2 rounded-full ${colors.dot}`} title={d} />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  {card.number && (
                    <span className="text-xs text-gray-500">#{card.number}</span>
                  )}
                </div>
                <div className="mt-2 space-y-0.5">
                  {normalPrice != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Normal</span>
                      <span className="text-green-400 font-medium">
                        {formatPrice(normalPrice)}
                      </span>
                    </div>
                  )}
                  {foilPrice != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Foil</span>
                      <span className="text-yellow-400 font-medium">
                        {formatPrice(foilPrice)}
                      </span>
                    </div>
                  )}
                  {normalPrice == null && foilPrice == null && (
                    <div className="text-xs text-gray-500">No price data</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <PriceChartModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
