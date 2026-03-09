export const ISO_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD", "MXN", "SGD", "HKD", "NOK", "KRW", "TRY", "INR", "RUB", "BRL", "ZAR", "ILS", "DKK", "PLN", "THB", "IDR", "HUF", "CZK", "CLP", "PHP", "AED", "COP", "SAR", "MYR", "RON"
];

export const CURRENCY_TO_COUNTRY = {
  USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", AUD: "au", CAD: "ca", CHF: "ch", CNY: "cn",
  SEK: "se", NZD: "nz", MXN: "mx", SGD: "sg", HKD: "hk", NOK: "no", KRW: "kr", TRY: "tr",
  INR: "in", RUB: "ru", BRL: "br", ZAR: "za", ILS: "il", DKK: "dk", PLN: "pl", THB: "th",
  IDR: "id", HUF: "hu", CZK: "cz", CLP: "cl", PHP: "ph", AED: "ae", COP: "co", SAR: "sa",
  MYR: "my", RON: "ro"
};

export const CURRENCY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#ef4444'
];

const COLORS_MAP = {};
export const getCurrencyColor = (code, index) => {
  if (COLORS_MAP[code]) return COLORS_MAP[code];
  const color = CURRENCY_COLORS[index % CURRENCY_COLORS.length];
  COLORS_MAP[code] = color;
  return color;
};

// ─── DEFAULT PORTFOLIO ────────────────────────────────────────────────────────
// Source: fx_planner_template (3).csv  –  all rates are in USD/LC (USD_PER_LOCAL)

export const DEFAULT_PORTFOLIO = [
  // ── USD (base currency) ───────────────────────────────────────────────────
  {
    id: 1, code: 'USD', budgetType: 'monthly', annualBudgetRate: 1.00,
    quarterlyRates: [1.00, 1.00, 1.00, 1.00],
    monthlyRates: Array(12).fill(1.00),
    actualRate: 1.00, monthlyActualRates: Array(12).fill(1.00),
    monthlyVolumes: Array(12).fill(2500000),
    isCollapsed: true, rateDirection: 'LOCAL_PER_USD',
    rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV'),
  },

  // ── ILS  (H1 budget: 3.2 ILS/USD  →  0.3125 USD/ILS;  H2: 3.3 ILS/USD → 0.303030) ──
  {
    id: 2, code: 'ILS', budgetType: 'monthly',
    annualBudgetRate: 0.307765152,                          // avg of H1+H2 monthly rates
    quarterlyRates: [0.3125, 0.3125, 0.303030303, 0.303030303],
    monthlyRates: [
      0.3125, 0.3125, 0.3125,
      0.3125, 0.3125, 0.3125,
      0.303030303, 0.303030303, 0.303030303,
      0.303030303, 0.303030303, 0.303030303,
    ],
    actualRate: 0.320034731,
    monthlyActualRates: [
      0.322580645, 0.322580645, 0.319488818,
      0.319488818, 0.319488818, 0.319488818,
      0.319488818, 0.319488818, 0.319488818,
      0.319488818, 0.319488818, 0.319488818,
    ],
    monthlyVolumes: [
      6666666.667, 6666666.667, 6666666.667,
      6666666.667, 6666666.667, 6666666.667,
      6875000, 6875000, 6875000,
      6875000, 6875000, 6875000,
    ],
    isCollapsed: true, rateDirection: 'USD_PER_LOCAL',
    rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV'),
  },

  // ── AUD  (budget: 0.60 USD/AUD) ───────────────────────────────────────────
  {
    id: 3, code: 'AUD', budgetType: 'annual', annualBudgetRate: 0.60,
    quarterlyRates: [0.60, 0.60, 0.60, 0.60],
    monthlyRates: Array(12).fill(0.60),
    actualRate: 0.7375,
    monthlyActualRates: [
      0.70, 0.70, 0.75,
      0.75, 0.75, 0.75,
      0.75, 0.75, 0.75,
      0.75, 0.75, 0.75,
    ],
    monthlyVolumes: Array(12).fill(2777777.778),
    isCollapsed: true, rateDirection: 'USD_PER_LOCAL',
    rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV'),
  },

  // ── GBP  (budget: 1.30 USD/GBP) ───────────────────────────────────────────
  {
    id: 4, code: 'GBP', budgetType: 'annual', annualBudgetRate: 1.30,
    quarterlyRates: [1.30, 1.30, 1.30, 1.30],
    monthlyRates: Array(12).fill(1.30),
    actualRate: 1.39333,
    monthlyActualRates: [
      1.36, 1.40, 1.40,
      1.40, 1.40, 1.40,
      1.40, 1.40, 1.40,
      1.40, 1.40, 1.40,
    ],
    monthlyVolumes: Array(12).fill(961538.4615),
    isCollapsed: true, rateDirection: 'USD_PER_LOCAL',
    rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV'),
  },

  // ── SGD  (budget: 0.75 USD/SGD) ───────────────────────────────────────────
  {
    id: 5, code: 'SGD', budgetType: 'annual', annualBudgetRate: 0.75,
    quarterlyRates: [0.75, 0.75, 0.75, 0.75],
    monthlyRates: Array(12).fill(0.75),
    actualRate: 0.81750,
    monthlyActualRates: [
      0.79, 0.82, 0.82,
      0.82, 0.82, 0.82,
      0.82, 0.82, 0.82,
      0.82, 0.82, 0.82,
    ],
    monthlyVolumes: Array(12).fill(1111111.111),
    isCollapsed: true, rateDirection: 'USD_PER_LOCAL',
    rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV'),
  },
];
