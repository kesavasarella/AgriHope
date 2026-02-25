// lib/pricing.ts

export type QualityGrade = "A" | "B" | "C";

export interface PricingInput {
  cropType: string;                 // e.g. "Wheat", "Rice", "Tomato"
  qualityGrade: QualityGrade;       // A, B, C
  quantityKg: number;               // Quantity being priced (kg)
  demandIndex?: number;             // 0.0 - 2.0 (1.0 = normal demand)
  seasonalityIndex?: number;        // 0.7 - 1.3 (1.0 = in-season)
  transportDistanceKm?: number;     // Distance to market
  hasQualityCertificates?: boolean; // Bonus if true
  inflationMultiplier?: number;     // Adjust for inflation (default 1.0)
}

export interface PricingBreakdown {
  baseFromCrop: number;
  qualityMultiplier: number;
  demandMultiplier: number;
  seasonalityMultiplier: number;
  inflationMultiplier: number;
  transportCostPerKg: number;
  certificateBonusPerKg: number;
}

export interface PricingResult {
  pricePerKg: number;
  totalPrice: number;
  breakdown: PricingBreakdown;
}

// 1) Base price per kg by crop (INR). Extend as needed.
const BASE_CROP_PRICES: Record<string, number> = {
  Wheat: 24,
  Rice: 28,
  Maize: 20,
  Tomato: 18,
  Potato: 16,
  Onion: 22,
  // Default fallback if cropType not found:
  _default: 20,
};

// 2) Quality multipliers
const QUALITY_MULTIPLIERS: Record<QualityGrade, number> = {
  A: 1.2,
  B: 1.0,
  C: 0.85,
};

// 3) Certificate bonus (per kg)
const CERTIFICATE_BONUS_PER_KG = 1.5;

// 4) Transport cost model: base + per-km spread, normalized per kg
const TRANSPORT_BASE_PER_KG = 0.5;
const TRANSPORT_PER_KM_PER_KG = 0.03;

// 5) Guardrails to keep indexes in reasonable bounds
function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

/**
 * Compute the base price per kg (INR) and total, with a factor breakdown.
 * This function is deterministic and side-effect free.
 */
export function computeBasePricePerKg(input: PricingInput): PricingResult {
  const cropBase = BASE_CROP_PRICES[input.cropType] ?? BASE_CROP_PRICES._default;

  const qualityMultiplier = QUALITY_MULTIPLIERS[input.qualityGrade];

  const demandMultiplier = clamp(input.demandIndex ?? 1.0, 0.5, 2.0);
  const seasonalityMultiplier = clamp(input.seasonalityIndex ?? 1.0, 0.6, 1.4);
  const inflationMultiplier = clamp(input.inflationMultiplier ?? 1.0, 0.8, 1.5);

  const distance = Math.max(0, input.transportDistanceKm ?? 0);
  const transportCostPerKg = TRANSPORT_BASE_PER_KG + distance * TRANSPORT_PER_KM_PER_KG;

  const certificateBonusPerKg = input.hasQualityCertificates ? CERTIFICATE_BONUS_PER_KG : 0;

  // Core price (before transport and certificate adjustments)
  const corePricePerKg =
    cropBase *
    qualityMultiplier *
    demandMultiplier *
    seasonalityMultiplier *
    inflationMultiplier;

  // Final price per kg
  const pricePerKg = round2(corePricePerKg + certificateBonusPerKg + transportCostPerKg);

  const qty = Math.max(0, input.quantityKg);
  const totalPrice = round2(pricePerKg * qty);

  return {
    pricePerKg,
    totalPrice,
    breakdown: {
      baseFromCrop: cropBase,
      qualityMultiplier,
      demandMultiplier,
      seasonalityMultiplier,
      inflationMultiplier,
      transportCostPerKg: round2(transportCostPerKg),
      certificateBonusPerKg: round2(certificateBonusPerKg),
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Calculate proportional price based on total price and quantities
 * Example: If farmer sells 150kg rice for ₹250,000 total, and distributor wants 50kg
 * Price per kg = ₹250,000 ÷ 150kg = ₹1,666.67
 * Distributor pays = 50kg × ₹1,666.67 = ₹83,333.50
 */
export function calculateProportionalPrice(params: {
  totalPrice: number;
  totalQuantityKg: number;
  requestedQuantityKg: number;
}): {
  pricePerKg: number;
  proportionalPrice: number;
} {
  const { totalPrice, totalQuantityKg, requestedQuantityKg } = params;
  
  if (totalQuantityKg <= 0) {
    throw new Error("Total quantity must be greater than 0");
  }
  
  if (requestedQuantityKg <= 0) {
    throw new Error("Requested quantity must be greater than 0");
  }
  
  if (requestedQuantityKg > totalQuantityKg) {
    throw new Error("Requested quantity cannot exceed total quantity");
  }
  
  const pricePerKg = round2(totalPrice / totalQuantityKg);
  const proportionalPrice = round2(pricePerKg * requestedQuantityKg);
  
  return {
    pricePerKg,
    proportionalPrice
  };
}

/**
 * Get the latest listed price per kg for a product
 * This looks at the most recent "listed" event and calculates price per kg
 */
export async function getProductPricePerKg(productId: string, db: any): Promise<number | null> {
  try {
    const product = await db.getProductByProductId(productId);
    if (!product) return null;
    
    const events = await db.getProductEvents(productId);
    const listedEvents = events
      .filter((e: any) => e.event_type === "listed" && typeof e.price === "number")
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (listedEvents.length === 0) return null;
    
    const latestEvent = listedEvents[0];
    const totalPrice = latestEvent.price as number;
    
    // Calculate price per kg based on current product quantity
    const pricePerKg = round2(totalPrice / product.quantity_kg);
    
    return pricePerKg;
  } catch (error) {
    console.error("Error calculating price per kg:", error);
    return null;
  }
}
