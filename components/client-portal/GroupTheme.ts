import {
  User, MapPin, FileText, Image, DollarSign, Ruler, HelpCircle,
  Building2, ClipboardList, Home,
  type LucideIcon,
} from "lucide-react";

export type GroupTheme = { icon: LucideIcon; dot: string; border: string; bg: string };

const PALETTE: { dot: string; border: string; bg: string }[] = [
  { dot: "#0d2137", border: "#0d2137", bg: "#eef2f6" }, // navy
  { dot: "#0d9488", border: "#0d9488", bg: "#f0fdfa" }, // teal
  { dot: "#7c3aed", border: "#7c3aed", bg: "#f5f3ff" }, // purple
  { dot: "#d97706", border: "#d97706", bg: "#fffbeb" }, // amber
  { dot: "#db2777", border: "#db2777", bg: "#fdf2f8" }, // pink
  { dot: "#059669", border: "#059669", bg: "#ecfdf5" }, // green
  { dot: "#0891b2", border: "#0891b2", bg: "#f0f9ff" }, // cyan
  { dot: "#dc2626", border: "#dc2626", bg: "#fff1f2" }, // red
];

// Known group slugs -> icon. Falls back to keyword matching, then HelpCircle.
const SLUG_ICON: Record<string, LucideIcon> = {
  "client-profile": User,
  "contact-details": User,
  "property-location": MapPin,
  "location": MapPin,
  "documents": FileText,
  "photos": Image,
  "pricing": DollarSign,
  "commission": DollarSign,
  "land-details": Ruler,
  "property-details": Building2,
  "requirements": ClipboardList,
  "amenities": Home,
};

const KEYWORD_ICON: [RegExp, LucideIcon][] = [
  [/location|address|area/i, MapPin],
  [/document|attach/i, FileText],
  [/photo|image|media/i, Image],
  [/price|commission|cost|budget/i, DollarSign],
  [/land|plot|dimension|size/i, Ruler],
  [/profile|contact|client|owner/i, User],
  [/amenit|facilit/i, Home],
  [/property|building|unit/i, Building2],
];

function iconFor(slug: string, name: string): LucideIcon {
  if (SLUG_ICON[slug]) return SLUG_ICON[slug];
  for (const [re, icon] of KEYWORD_ICON) {
    if (re.test(name) || re.test(slug)) return icon;
  }
  return HelpCircle;
}

export function getGroupTheme(slug: string, name: string, positionalIndex: number): GroupTheme {
  const color = PALETTE[positionalIndex % PALETTE.length];
  return { icon: iconFor(slug, name), ...color };
}
