"use client";

import { RIFTBOUND_SETS } from "@/lib/types";

interface SetSelectorProps {
  selectedGroupId: number | "all" | null;
  onSelect: (groupId: number | "all") => void;
}

export default function SetSelector({ selectedGroupId, onSelect }: SetSelectorProps) {
  const mainSets = RIFTBOUND_SETS.filter((s) => s.main);
  const subSets = RIFTBOUND_SETS.filter((s) => !s.main);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          onClick={() => onSelect("all")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            selectedGroupId === "all"
              ? "bg-accent-600 text-white shadow-lg"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
          }`}
        >
          All
        </button>
        {mainSets.map((set) => (
          <button
            key={set.groupId}
            onClick={() => onSelect(set.groupId)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              selectedGroupId === set.groupId
                ? "bg-accent-600 text-white shadow-lg"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <span className="font-bold">{set.abbreviation}</span>
            <span className="hidden sm:inline ml-1.5 text-xs opacity-75">
              {set.name}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Supplementary:</span>
        {subSets.map((set) => (
          <button
            key={set.groupId}
            onClick={() => onSelect(set.groupId)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedGroupId === set.groupId
                ? "bg-accent-600 text-white shadow-lg"
                : "bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            <span className="font-bold">{set.abbreviation}</span>
            <span className="hidden md:inline ml-1.5 opacity-75">
              {set.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
