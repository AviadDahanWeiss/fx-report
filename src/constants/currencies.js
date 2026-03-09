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

export const DEFAULT_PORTFOLIO = [
  {
    id: 1, code: 'USD', budgetType: 'monthly', annualBudgetRate: 1.00,
    quarterlyRates: Array(4).fill(1.00), monthlyRates: Array(12).fill(1.00),
    actualRate: 1.00, monthlyActualRates: Array(12).fill(1.00),
    monthlyVolumes: Array(12).fill(2500000), isCollapsed: true,
    rateDirection: 'LOCAL_PER_USD', rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV')
  },
  {
    id: 2, code: 'ILS', budgetType: 'monthly', annualBudgetRate: 0.3125,
    quarterlyRates: Array(4).fill(0.3125), monthlyRates: Array(12).fill(0.3125),
    actualRate: 0.3125,
    monthlyActualRates: [0.32, 0.32, 0.32, 0.3125, 0.3125, 0.3125, 0.3125, 0.3125, 0.3125, 0.3125, 0.3125, 0.3125],
    monthlyVolumes: [
      6666666.667, 6666666.667, 6666666.667, 6666666.667, 6666666.667, 6666666.667,
      6875000, 6875000, 6875000, 6875000, 6875000, 6875000
    ],
    isCollapsed: true, rateDirection: 'USD_PER_LOCAL', rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV')
  }
];
