"use client";

import { Card, PriceHistoryEntry, RIFTBOUND_SETS } from "@/lib/types";
import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "./CurrencyContext";

interface PriceChartModalProps {
  card: Card;
  onClose: () => void;
}

export default function PriceChartModal({ card, onClose }: PriceChartModalProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice, convert, symbol } = useCurrency();

  const setName = RIFTBOUND_SETS.find((s) => s.groupId === card.groupId)?.name ?? "";

  useEffect(() => {
    fetch(`/api/price-history?productId=${card.productId}&days=90`)
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [card.productId]);

  const normalPrice = card.prices.find((p) => p.subTypeName === "Normal");
  const foilPrice = card.prices.find((p) => p.subTypeName === "Foil");

  const convertedHistory = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        marketPrice: convert(h.marketPrice),
        lowPrice: convert(h.lowPrice),
      })),
    [history, convert]
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-t-xl sm:rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className="min-w-0 mr-2">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">{card.cleanName}</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {setName} {card.number ? `#${card.number}` : ""} &middot;{" "}
                {card.rarity} &middot; {card.cardType}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none shrink-0"
            >
              &times;
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="sm:w-48 shrink-0 relative">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.cleanName}
                  className="w-full rounded-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    target.parentElement!.querySelector("[data-placeholder]")!.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div data-placeholder className={`w-full aspect-[5/7] bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 ${card.imageUrl ? "hidden" : ""}`}>
                No Image
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {normalPrice && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Normal</div>
                    <div className="text-lg font-bold text-green-400">
                      {formatPrice(normalPrice.marketPrice)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div>Low: {formatPrice(normalPrice.lowPrice)}</div>
                      <div>Mid: {formatPrice(normalPrice.midPrice)}</div>
                      <div>High: {formatPrice(normalPrice.highPrice)}</div>
                    </div>
                  </div>
                )}
                {foilPrice && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">Foil</div>
                    <div className="text-lg font-bold text-yellow-400">
                      {formatPrice(foilPrice.marketPrice)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div>Low: {formatPrice(foilPrice.lowPrice)}</div>
                      <div>Mid: {formatPrice(foilPrice.midPrice)}</div>
                      <div>High: {formatPrice(foilPrice.highPrice)}</div>
                    </div>
                  </div>
                )}
              </div>

              {card.domain && (
                <div className="text-sm">
                  <span className="text-gray-400">Domain:</span>{" "}
                  <span className="text-white">{card.domain}</span>
                </div>
              )}
              {card.description && (
                <p className="text-sm text-gray-400 italic">{card.description}</p>
              )}
              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-400 hover:text-accent-300 text-sm inline-block"
                >
                  View on TCGplayer →
                </a>
              )}
            </div>
          </div>

          {convertedHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Price History (90 days)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={convertedHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="recordedAt"
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${symbol}${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${symbol}${Number(value).toFixed(2)}`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="marketPrice"
                    name="Market"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lowPrice"
                    name="Low"
                    stroke="#34D399"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {loading && history.length === 0 && (
            <div className="mt-6 text-center text-gray-500 text-sm">
              Loading price history...
            </div>
          )}

          {!loading && history.length === 0 && (
            <div className="mt-6 text-center text-sm text-gray-500 bg-gray-800 rounded-lg p-4">
              No price history yet. Run a sync to start tracking prices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
