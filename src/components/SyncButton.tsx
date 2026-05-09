"use client";

import { useState } from "react";

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResult(`Synced ${data.totalCards} cards, ${data.totalPrices} price entries`);
      } else {
        setResult("Sync failed: " + (data.error || "Unknown error"));
      }
    } catch {
      setResult("Sync failed — network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
      >
        {syncing ? "Syncing..." : "Sync Prices"}
      </button>
      {result && <span className="text-xs text-gray-400 hidden sm:inline">{result}</span>}
    </div>
  );
}
