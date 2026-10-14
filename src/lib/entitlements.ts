import { FEATURES, PLANS, type FeatureId, type Plan, type PlanId } from "@/config/plans";

export function getPlan(id: PlanId): Plan {
  const p = PLANS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown plan ${id}`);
  return p;
}

/**
 * Can this plan use this feature right now?
 * A feature must be both included in the plan AND built ("available").
 * Pilot features are enabled only for pilot partners.
 */
export function canUse(plan: PlanId, feature: FeatureId, opts: { pilotPartner?: boolean } = {}): boolean {
  if (!getPlan(plan).features.includes(feature)) return false;
  const a = FEATURES[feature].availability;
  return a === "available" || (a === "pilot" && opts.pilotPartner === true);
}

/** Daily AI allowance; env can lower it during cost spikes (AI_FREE_DAILY_LIMIT). */
export function aiDailyAllowance(plan: PlanId, env: Record<string, string | undefined> = process.env): number {
  const base = getPlan(plan).aiPerDay;
  if (plan !== "free") return base;
  const raw = (env.AI_FREE_DAILY_LIMIT ?? "").trim();
  if (raw === "") return base; // an empty "AI_FREE_DAILY_LIMIT=" line must not mean zero
  const override = Number(raw);
  return Number.isInteger(override) && override >= 0 && override <= base ? override : base;
}

export function formatPrice(plan: Plan): string {
  if (!plan.priceInr) return "Founding price on request";
  if (plan.priceInr.amount === 0) return "Free forever";
  return `₹${plan.priceInr.amount.toLocaleString("en-IN")} ${plan.priceInr.unit}`;
}

/** Features a plan adds over the previous plan in the list — used for upgrade prompts. */
export function addedOver(prev: PlanId, next: PlanId): FeatureId[] {
  const p = new Set(getPlan(prev).features);
  return getPlan(next).features.filter((f) => !p.has(f));
}
