"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type Currency = "USD" | "MYR";

interface CurrencyContextValue {
  currency: Currency;
  toggleCurrency: () => void;
  convert: (usdAmount: number | null) => number | null;
  formatPrice: (usdAmount: number | null) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [myrRate, setMyrRate] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((data) => {
        if (data.rate) setMyrRate(data.rate);
      })
      .catch(() => {});
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((c) => (c === "USD" ? "MYR" : "USD"));
  }, []);

  const convert = useCallback(
    (usdAmount: number | null): number | null => {
      if (usdAmount == null) return null;
      if (currency === "USD" || myrRate == null) return usdAmount;
      return usdAmount * myrRate;
    },
    [currency, myrRate]
  );

  const symbol = currency === "USD" ? "$" : "RM";

  const formatPrice = useCallback(
    (usdAmount: number | null): string => {
      const converted = convert(usdAmount);
      if (converted == null) return "N/A";
      return `${symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [convert, symbol]
  );

  return (
    <CurrencyContext.Provider value={{ currency, toggleCurrency, convert, formatPrice, symbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
