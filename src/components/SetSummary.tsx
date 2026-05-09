"use client";

import { Card, RIFTBOUND_SETS } from "@/lib/types";
import { useCurrency } from "./CurrencyContext";

interface SetSummaryProps {
  cards: Card[];
  groupId: number | null;
}

export default function SetSummary({ cards, groupId }: SetSummaryProps) {
  const { formatPrice } = useCurrency();
  if (!groupId || cards.length === 0) return null;

  const set = RIFTBOUND_SETS.find((s) => s.groupId === groupId);
  if (!set) return null;

  let normalTotal = 0;
  let foilTotal = 0;
  let normalCount = 0;
  let foilCount = 0;

  for (const card of cards) {
    for (const price of card.prices) {
      const val = price.marketPrice ?? price.midPrice ?? 0;
      if (price.subTypeName === "Normal") {
        normalTotal += val;
        normalCount++;
      } else if (price.subTypeName === "Foil") {
        foilTotal += val;
        foilCount++;
      }
    }
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 sm:gap-x-6 sm:gap-y-2">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Set</span>
          <p className="text-white font-semibold">{set.name}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Cards</span>
          <p className="text-white font-semibold">{cards.length}</p>
        </div>
        {normalCount > 0 && (
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Normal Total ({normalCount})
            </span>
            <p className="text-green-400 font-semibold">{formatPrice(normalTotal)}</p>
          </div>
        )}
        {foilCount > 0 && (
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">
              Foil Total ({foilCount})
            </span>
            <p className="text-yellow-400 font-semibold">{formatPrice(foilTotal)}</p>
          </div>
        )}
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Combined</span>
          <p className="text-accent-400 font-bold text-lg">
            {formatPrice(normalTotal + foilTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
