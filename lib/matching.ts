// Shared Project-vs-Project matching/scoring logic.
// Demand side = Buy/Tenant subcategory Project (what a client wants).
// Listing side = Sell/Sale/Rent subcategory Project (available inventory).
// Both sides are scored purely from their Response[] (via question label lookup),
// since both are now the same Template/QuestionGroup/Question/Response mechanism.

export type ProjectForScoring = {
  id: string;
  categoryId: string;
  subcategory: { name: string };
  responses: { question: { label: string }; value: string | null }[];
};

export function rMap(project: ProjectForScoring): Record<string, string> {
  return Object.fromEntries(project.responses.map(r => [r.question.label.toLowerCase(), r.value ?? ""]));
}

// REPEATER responses are stored as a JSON array of row objects, e.g. [{"Area / Locality": "Anna Nagar"}, ...].
function parseRepeaterColumn(rawValue: string | undefined, column: string): string[] {
  if (!rawValue) return [];
  try {
    const rows = JSON.parse(rawValue);
    if (!Array.isArray(rows)) return [];
    return rows.map((row: Record<string, string>) => row[column]).filter((v): v is string => !!v);
  } catch {
    return [];
  }
}

// A Buy-demand project should only match inventory listed for sale (Land uses "Sale", others use "Sell");
// a Tenant-demand project should only match inventory listed for rent. Without this, matching pulled in
// unrelated inventory — e.g. a tenant looking to rent could match against a "Buy" mandate project.
export function isSellSide(subcategoryName: string) {
  return subcategoryName === "Sell" || subcategoryName === "Sale";
}

export function isDemandSide(subcategoryName: string) {
  return subcategoryName === "Buy" || subcategoryName === "Tenant";
}

export function demandMode(subcategoryName: string): "buyer" | "tenant" | null {
  if (subcategoryName === "Buy") return "buyer";
  if (subcategoryName === "Tenant") return "tenant";
  return null;
}

// Map category/subcategory to a scoring profile slug. Land Sale, Joint Venture, and
// Redevelopment each get their own profile (instead of one shared "special-projects"
// profile) because their templates carry genuinely different fields (e.g. only Land
// Sale has a Commission field, only Redevelopment has a Consent field).
export function resolveScoringProfile(categoryName: string, subcategoryName: string, templateName: string): string {
  const sub  = subcategoryName.toLowerCase();
  const tmpl = templateName.toLowerCase();

  if (sub.includes("redevelopment") || tmpl.includes("redevelopment")) return "redevelopment";
  if (sub.includes("joint venture") || tmpl.includes("joint venture")) return "joint-venture";
  if (sub.includes("land sale") || tmpl.includes("land sale")) return "land-sale";

  if (
    sub.includes("rent") || sub.includes("rental") || sub.includes("lease") ||
    tmpl.includes("rent") || tmpl.includes("rental") || tmpl.includes("lease")
  ) return "rental";

  return "selling-buying";
}

export type ScoreResult = { pct: number; matched: string[]; missed: string[] };

export function scoreDemandAgainstListing(demand: ProjectForScoring, listing: ProjectForScoring): ScoreResult | null {
  if (listing.categoryId !== demand.categoryId) return null;

  const mode = demandMode(demand.subcategory.name);
  if (!mode) return null;
  if (mode === "buyer" && !isSellSide(listing.subcategory.name)) return null;
  if (mode === "tenant" && listing.subcategory.name !== "Rent") return null;

  const dMap = rMap(demand);
  const lMap = rMap(listing);
  const matched: string[] = [];
  const missed: string[] = [];

  if (mode === "buyer") {
    const budgetMin = parseFloat(dMap["budget — min"] ?? "0") || null;
    const budgetMax = parseFloat(dMap["budget — max"] ?? "0") || null;
    const price = parseFloat(
      lMap["price expected — min"] ?? lMap["asking price"] ?? lMap["sale price"] ?? lMap["price"] ?? "0"
    );
    if (price > 0) {
      const ok = (!budgetMin || price >= budgetMin * 0.9) && (!budgetMax || price <= budgetMax * 1.1);
      ok ? matched.push("Budget") : missed.push("Budget");
    } else {
      missed.push("Budget");
    }
  } else {
    const rentMin = parseFloat(dMap["rent budget — min"] ?? "0") || null;
    const rentMax = parseFloat(dMap["rent budget — max"] ?? "0") || null;
    const rent = parseFloat(
      lMap["rental — min"] ?? lMap["monthly rent"] ?? lMap["rent"] ?? lMap["expected rent"] ?? "0"
    );
    if (rent > 0) {
      const ok = (!rentMin || rent >= rentMin) && (!rentMax || rent <= rentMax);
      ok ? matched.push("Rent") : missed.push("Rent");
    } else {
      missed.push("Rent");
    }
  }

  const areaMin = parseFloat(dMap["area required — min"] ?? dMap["saleable area required"] ?? dMap["area required"] ?? "0") || null;
  const areaMax = parseFloat(dMap["area required — max"] ?? "0") || null;
  const area = parseFloat(
    lMap["land area as per sale deed"] ?? lMap["saleable area"] ?? lMap["built-up area"] ?? lMap["area"] ?? lMap["plot area"] ?? lMap["carpet area"] ?? "0"
  );
  if (area > 0 && (areaMin || areaMax)) {
    const ok = (!areaMin || area >= areaMin * 0.9) && (!areaMax || area <= areaMax * 1.1);
    ok ? matched.push("Area") : missed.push("Area");
  }

  if (mode === "buyer") {
    const bhk = dMap["number of bedrooms"] ?? "";
    if (bhk) {
      const propBhk = lMap["bhk"] ?? lMap["bedrooms"] ?? lMap["number of rooms"] ?? "";
      propBhk.toLowerCase().includes(bhk.toLowerCase()) ? matched.push("BHK") : missed.push("BHK");
    }
  }

  const furnishing = dMap["extent of furnishing"] ?? "";
  if (furnishing && furnishing !== "Any") {
    const propFurn = lMap["extent of furnishing"] ?? lMap["furnishing"] ?? lMap["furnishing status"] ?? "";
    propFurn.toLowerCase().includes(furnishing.toLowerCase()) ? matched.push("Furnishing") : missed.push("Furnishing");
  }

  const locs = parseRepeaterColumn(dMap["preferred areas (in order of preference)"], "Area / Locality");
  if (locs.length > 0) {
    const locality = (lMap["area / locality"] ?? lMap["locality"] ?? lMap["location"] ?? "").toLowerCase();
    const hit = locs.some(l => locality.includes(l.toLowerCase()));
    hit ? matched.push("Location") : missed.push("Location");
  }

  const total = matched.length + missed.length;
  const pct = total > 0 ? Math.round((matched.length / total) * 100) : 50;
  return { pct, matched, missed };
}
