export const DOMAINS = ["Body", "Calm", "Chaos", "Fury", "Mind", "Order"] as const;

export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_COLORS: Record<Domain, { bg: string; text: string; ring: string; dot: string }> = {
  Body:  { bg: "bg-orange-500/15", text: "text-orange-400", ring: "ring-orange-500", dot: "bg-orange-400" },
  Calm:  { bg: "bg-green-500/15",  text: "text-green-400",  ring: "ring-green-500",  dot: "bg-green-400" },
  Chaos: { bg: "bg-purple-500/15", text: "text-purple-400", ring: "ring-purple-500", dot: "bg-purple-400" },
  Fury:  { bg: "bg-red-500/15",    text: "text-red-400",    ring: "ring-red-500",    dot: "bg-red-400" },
  Mind:  { bg: "bg-blue-500/15",   text: "text-blue-400",   ring: "ring-blue-500",   dot: "bg-blue-400" },
  Order: { bg: "bg-yellow-500/15", text: "text-yellow-400", ring: "ring-yellow-500", dot: "bg-yellow-400" },
};

export function getDomainColor(domain: string): Domain | null {
  if (DOMAINS.includes(domain as Domain)) return domain as Domain;
  return null;
}
