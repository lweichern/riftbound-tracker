"use client";

import { useCurrency } from "./CurrencyContext";

export default function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <button
      onClick={toggleCurrency}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs sm:text-sm font-medium transition-colors"
    >
      <span className={currency === "USD" ? "text-white" : "text-gray-500"}>
        USD
      </span>
      <span className="text-gray-600">/</span>
      <span className={currency === "MYR" ? "text-white" : "text-gray-500"}>
        MYR
      </span>
    </button>
  );
}
