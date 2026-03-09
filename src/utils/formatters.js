export const formatNumber = (num) => {
  if (num === '' || num === undefined || num === null) return '';
  const clean = num.toString().replace(/,/g, '');
  if (isNaN(clean)) return num;
  return new Intl.NumberFormat('en-US').format(clean);
};

export const formatCompact = (num) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};

export const formatFinancial = (amount, unit = 1000) => {
  if (amount === undefined || amount === null) return '$0';
  let divisor = 1;
  let suffix = '';
  let decimals = 0;
  if (unit === 1000) { divisor = 1000; suffix = 'k'; decimals = 0; }
  else if (unit === 1000000) { divisor = 1000000; suffix = 'M'; decimals = 1; }
  const value = amount / divisor;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: decimals, minimumFractionDigits: decimals
  }).format(value) + (suffix ? suffix : '');
};

export const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

export const getMonthName = (monthIndex) => {
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return monthNames[monthIndex];
};
