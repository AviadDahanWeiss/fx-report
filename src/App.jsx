import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, LabelList, ComposedChart, Customized, Area, AreaChart } from 'recharts';
import { TrendingUp, Shield, AlertTriangle, ArrowRight, Sun, Moon, Crosshair, Activity, DollarSign, Lock, Calendar, Layers, Grid, Square, ChevronUp, ChevronDown, Plus, Trash2, Globe, LayoutDashboard, X, PlusSquare, MinusSquare, Search, ArrowLeftRight, Filter, Check, XCircle, PieChart, BarChart2, Download, Upload, FileSpreadsheet, RefreshCw, Database, Table, Zap, FileText, User, Calculator, PanelLeft, PanelLeftClose, PanelLeftOpen, Menu, Info } from 'lucide-react';

// --- CONSTANTS & FLAGS ---
const ISO_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD", "MXN", "SGD", "HKD", "NOK", "KRW", "TRY", "INR", "RUB", "BRL", "ZAR", "ILS", "DKK", "PLN", "THB", "IDR", "HUF", "CZK", "CLP", "PHP", "AED", "COP", "SAR", "MYR", "RON"
];
const CURRENCY_TO_COUNTRY = {
  USD: "us", EUR: "eu", GBP: "gb", JPY: "jp", AUD: "au", CAD: "ca", CHF: "ch", CNY: "cn",
  SEK: "se", NZD: "nz", MXN: "mx", SGD: "sg", HKD: "hk", NOK: "no", KRW: "kr", TRY: "tr",
  INR: "in", RUB: "ru", BRL: "br", ZAR: "za", ILS: "il", DKK: "dk", PLN: "pl", THB: "th",
  IDR: "id", HUF: "hu", CZK: "cz", CLP: "cl", PHP: "ph", AED: "ae", COP: "co", SAR: "sa",
  MYR: "my", RON: "ro"
};
const CURRENCY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#ef4444'
];
const COLORS_MAP = {};
const getCurrencyColor = (code, index) => {
  if (COLORS_MAP[code]) return COLORS_MAP[code];
  const color = CURRENCY_COLORS[index % CURRENCY_COLORS.length];
  COLORS_MAP[code] = color;
  return color;
};

// --- HELPER FUNCTIONS ---
const formatNumber = (num) => {
  if (num === '' || num === undefined || num === null) return '';
  const clean = num.toString().replace(/,/g, '');
  if (isNaN(clean)) return num;
  return new Intl.NumberFormat('en-US').format(clean);
};
const formatCompact = (num) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
};
const formatFinancial = (amount, unit = 1000) => {
  if (amount === undefined || amount === null) return '$0';
  let divisor = 1;
  let suffix = '';
  let decimals = 0;
  if (unit === 1000) { divisor = 1000; suffix = 'k'; decimals = 0; }
  else if (unit === 1000000) { divisor = 1000000; suffix = 'M'; decimals = 1; }
  const value = amount / divisor;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value) + (suffix ? suffix : '');
};
const fmtUSD = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;
const getMonthName = (monthIndex) => {
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return monthNames[monthIndex];
};

// --- SUB-COMPONENTS ---
const FormattedInput = ({ value, onChange, className }) => {
  const [displayVal, setDisplayVal] = useState(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused) { setDisplayVal(formatNumber(value)); }
  }, [value, isFocused]);
  const handleChange = (e) => {
    const val = e.target.value;
    setDisplayVal(val);
    const rawValue = val.replace(/,/g, '');
    if (!isNaN(rawValue) && rawValue !== '') { onChange(rawValue); }
    else if (rawValue === '') { onChange(0); }
  };
  return (
    <input
      type="text"
      value={displayVal}
      onChange={handleChange}
      onFocus={() => { setIsFocused(true); setDisplayVal(value ? value.toString() : ''); }}
      onBlur={() => { setIsFocused(false); setDisplayVal(formatNumber(value)); }}
      className={className}
    />
  );
};

const DecimalInput = ({ value, onChange, className, precision = 4 }) => {
  const [localVal, setLocalVal] = useState(value?.toFixed(precision));
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!isFocused && value !== undefined && value !== null) { setLocalVal(value.toFixed(precision)); }
  }, [value, isFocused, precision]);
  const handleChange = (e) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) {
      setLocalVal(val);
      const num = parseFloat(val);
      if (!isNaN(num)) { onChange(num); }
    }
  };
  return (
    <input
      type="text"
      value={localVal}
      onChange={handleChange}
      onFocus={() => { setIsFocused(true); }}
      onBlur={() => { setIsFocused(false); if (value) setLocalVal(value.toFixed(precision)); }}
      className={className}
    />
  );
};

const FlagIcon = ({ code, className = "w-5 h-auto rounded-[2px]" }) => {
  const countryCode = CURRENCY_TO_COUNTRY[code];
  if (!countryCode) return <Globe size={14} className="text-gray-400" />;
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
      alt={code}
      className={`${className} shadow-sm object-cover`}
    />
  );
};

const MiniSourceChip = ({ source }) => {
  let styles = "bg-gray-500/10 text-gray-400 border-gray-500/20";
  let icon = <Check size={6} />;
  let label = "MIX";
  if (source === 'CSV') { styles = "bg-green-500/10 text-green-400 border-green-500/20"; icon = <FileText size={6} />; label = "CSV"; }
  else if (source === 'UI-Manual') { styles = "bg-blue-500/10 text-blue-400 border-blue-500/20"; icon = <User size={6} />; label = "Man"; }
  else if (source === 'API') { styles = "bg-purple-500/10 text-purple-400 border-purple-500/20"; icon = <Database size={6} />; label = "API"; }
  else if (source === 'Budget') { styles = "bg-amber-500/10 text-amber-400 border-amber-500/20"; icon = <Calculator size={6} />; label = "Bud"; }
  return (
    <div className={`flex items-center gap-0.5 px-1 py-[1px] rounded-[2px] border ${styles} text-[8px] font-mono leading-none pointer-events-none`}>
      {icon} {label}
    </div>
  );
};

const DifferenceConnector = (props) => {
  const { xAxis, yAxis, totalBudget, totalActual } = props;
  if (!xAxis || !yAxis) return null;
  const xBudget = xAxis.scale(0);
  const xActual = xAxis.scale(1);
  const bandwidth = xAxis.bandwidth;
  if (xBudget === undefined || xActual === undefined) return null;
  const yBudget = yAxis.scale(totalBudget);
  const yActual = yAxis.scale(totalActual);
  const x1 = xBudget + bandwidth;
  const y1 = yBudget;
  const x2 = xActual;
  const y2 = yActual;
  const diff = totalActual - totalBudget;
  const strokeColor = diff > 0 ? '#ef4444' : '#10b981';
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth={2} strokeDasharray="4 4" />
      <circle cx={x1} cy={y1} r={3} fill={strokeColor} />
      <circle cx={x2} cy={y2} r={3} fill={strokeColor} />
    </g>
  );
};

const CustomTotalLabel = (props) => {
  const { x, y, value, displayUnit, darkMode } = props;
  if (value === undefined || value === null) return null;
  const formatted = formatFinancial(value, displayUnit);
  const width = 36;
  const height = 18;
  const isPositive = value >= 0;
  const yOffset = isPositive ? -25 : 8;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x={x - width / 2} y={y + yOffset} width={width} height={height} rx={2} fill={darkMode ? "#000000" : "#ffffff"} stroke={isPositive ? "#10b981" : "#ef4444"} strokeWidth={1} filter="url(#labelShadow)" />
      <text x={x} y={y + yOffset + 13} textAnchor="middle" fontSize={9} fontFamily="monospace" fontWeight="bold" fill={isPositive ? "#10b981" : "#ef4444"}>{formatted}</text>
    </g>
  );
};

const CustomRateTooltip = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-2 border rounded-lg text-xs font-mono shadow-xl ${darkMode ? 'bg-black border-zinc-700 text-white' : 'bg-white border-zinc-200 text-black'}`}>
        <div className="mb-1 opacity-50 font-bold">{label}</div>
        {payload.map((entry, index) => {
          if (entry.dataKey === 'range' || typeof entry.value !== 'number') return null;
          return (
            <div key={index} style={{ color: entry.stroke || entry.fill }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}></span>
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value.toFixed(4)}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const CustomImpactTooltip = ({ active, payload, label, displayUnit }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 border shadow-xl rounded-lg text-xs font-mono bg-black border-zinc-600 text-white" style={{ fontSize: '12px' }}>
        <div className="mb-2 font-bold text-white border-b border-white/20 pb-1 flex items-center gap-2"><FlagIcon code={data.code} /> {data.code}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-blue-400"><span>Share:</span><span>{formatFinancial(data.rawShare, displayUnit)} ({fmtPct(data.share)})</span></div>
          {data.code !== 'USD' && (
            <div className="flex justify-between gap-4 text-amber-500"><span>Impact:</span><span>{formatFinancial(data.rawImpact, displayUnit)} ({fmtPct(data.impact)})</span></div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const ParticleIntro = ({ onStart }) => {
  const [isReady, setIsReady] = useState(false);
  const [hoverButton, setHoverButton] = useState(false);
  useEffect(() => { setTimeout(() => setIsReady(true), 500); }, []);
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40 overflow-hidden">
      <div className={`relative z-50 transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <p className="text-white/40 font-mono text-[10px] tracking-[0.4em] uppercase mb-8">System Initialized</p>
          <button onClick={onStart} onMouseEnter={() => setHoverButton(true)} onMouseLeave={() => setHoverButton(false)} className="pointer-events-auto px-12 py-4 bg-transparent border border-white/20 text-white font-bold tracking-[0.25em] text-xs hover:bg-white hover:text-black hover:border-white transition-all duration-300 backdrop-blur-sm uppercase">Enter Dashboard</button>
        </div>
      </div>
    </div>
  );
};

// --- PLANNING MODAL ---
const PlanningModal = ({ isOpen, onClose, portfolio, onUpdatePortfolio, onAddCurrency, onRemoveCurrency, onBulkImport, onFillForecast, theme, darkMode, currentYTDMonth, scrollToRates }) => {
  const ratesSectionRef = useRef(null);
  const [expandedYear, setExpandedYear] = useState(true);
  const [expandedQuarters, setExpandedQuarters] = useState([false, false, false, false]);
  const [planningYear, setPlanningYear] = useState(2026);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [flashStates, setFlashStates] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(null);
  const fileInputRef = useRef(null);
  const months = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], []);
  const quarters = useMemo(() => ['Q1', 'Q2', 'Q3', 'Q4'], []);
  const filteredCurrencies = useMemo(() => ISO_CURRENCIES.filter(c =>
    c.includes(currencySearch.toUpperCase()) && !portfolio.find(p => p.code === c)
  ), [currencySearch, portfolio]);

  useEffect(() => {
    if (isOpen && scrollToRates && ratesSectionRef.current) {
      setTimeout(() => { ratesSectionRef.current.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }
  }, [isOpen, scrollToRates]);

  if (!isOpen) return null;

  const getQuarterVolume = (monthlyVolumes, qIndex) => { const start = qIndex * 3; return monthlyVolumes.slice(start, start + 3).reduce((a, b) => a + b, 0); };
  const getTotalVolume = (monthlyVolumes) => monthlyVolumes.reduce((a, b) => a + b, 0);
  const getQuarterRate = (monthlyRates, qIndex) => { const start = qIndex * 3; const qRates = monthlyRates.slice(start, start + 3); return qRates.reduce((a, b) => a + b, 0) / 3; };
  const getAnnualRate = (monthlyRates) => monthlyRates.reduce((a, b) => a + b, 0) / 12;

  const setViewAnnual = () => { setExpandedYear(false); setExpandedQuarters([false, false, false, false]); };
  const setViewQuarterly = () => { setExpandedYear(true); setExpandedQuarters([false, false, false, false]); };
  const setViewMonthly = () => { setExpandedYear(true); setExpandedQuarters([true, true, true, true]); };

  const handleVolumeMonthUpdate = (id, monthIndex, value) => { const curr = portfolio.find(c => c.id === id); const newVolumes = [...curr.monthlyVolumes]; newVolumes[monthIndex] = Number(value); onUpdatePortfolio(id, { ...curr, monthlyVolumes: newVolumes }); };
  const handleVolumeQuarterUpdate = (id, qIndex, value) => { const curr = portfolio.find(c => c.id === id); const valPerMonth = Number(value) / 3; const newVolumes = [...curr.monthlyVolumes]; for (let i = 0; i < 3; i++) newVolumes[qIndex * 3 + i] = valPerMonth; onUpdatePortfolio(id, { ...curr, monthlyVolumes: newVolumes }); };
  const handleVolumeYearUpdate = (id, value) => { const curr = portfolio.find(c => c.id === id); const valPerMonth = Number(value) / 12; const newVolumes = Array(12).fill(valPerMonth); onUpdatePortfolio(id, { ...curr, monthlyVolumes: newVolumes }); };
  const handleRateMonthUpdate = (id, monthIndex, value) => { const curr = portfolio.find(c => c.id === id); const newRates = [...curr.monthlyRates]; newRates[monthIndex] = Number(value); onUpdatePortfolio(id, { ...curr, monthlyRates: newRates, annualBudgetRate: getAnnualRate(newRates), quarterlyRates: quarters.map((_, i) => getQuarterRate(newRates, i)) }); };
  const handleRateQuarterUpdate = (id, qIndex, value) => { const curr = portfolio.find(c => c.id === id); const val = Number(value); const newRates = [...curr.monthlyRates]; const newQRates = [...curr.quarterlyRates]; newQRates[qIndex] = val; for (let i = 0; i < 3; i++) newRates[qIndex * 3 + i] = val; onUpdatePortfolio(id, { ...curr, monthlyRates: newRates, quarterlyRates: newQRates, annualBudgetRate: getAnnualRate(newRates) }); };
  const handleRateYearUpdate = (id, value) => { const curr = portfolio.find(c => c.id === id); const val = Number(value); onUpdatePortfolio(id, { ...curr, annualBudgetRate: val, quarterlyRates: Array(4).fill(val), monthlyRates: Array(12).fill(val), budgetType: 'annual' }); };

  const handleActualMonthUpdate = (id, monthIndex, value) => {
    const curr = portfolio.find(c => c.id === id);
    const newRates = [...curr.monthlyActualRates];
    const newSources = [...(curr.monthlyRateSources || Array(12).fill('Manual'))];
    newRates[monthIndex] = Number(value);
    newSources[monthIndex] = 'UI-Manual';
    onUpdatePortfolio(id, { ...curr, monthlyActualRates: newRates, monthlyRateSources: newSources });
  };

  const handleFetchMarketData = () => {
    portfolio.forEach(curr => {
      if (curr.code === 'USD') return;
      const newSources = [...(curr.monthlyRateSources || Array(12).fill('Manual'))];
      const newActuals = curr.monthlyActualRates.map((r, i) => {
        if (i <= currentYTDMonth) {
          newSources[i] = 'API';
          const noise = (Math.random() - 0.5) * 0.1;
          return curr.monthlyRates[i] * (1 + noise);
        }
        return r;
      });
      onUpdatePortfolio(curr.id, { ...curr, monthlyActualRates: newActuals, monthlyRateSources: newSources });
    });
  };

  const handleForecastFillClick = () => {
    if (window.confirm("Are you sure? This will overwrite forecast rates for all future months with the current Budget Rate.")) {
      onFillForecast();
    }
  };

  const handleToggleDirection = (id) => {
    const curr = portfolio.find(c => c.id === id);
    const newDirection = curr.rateDirection === 'USD_PER_LOCAL' ? 'LOCAL_PER_USD' : 'USD_PER_LOCAL';
    const invert = (v) => (v !== 0 ? 1 / v : 0);
    const newAnnual = invert(curr.annualBudgetRate);
    const newQuarterly = curr.quarterlyRates.map(invert);
    const newMonthly = curr.monthlyRates.map(invert);
    const newActuals = curr.monthlyActualRates.map(invert);
    setFlashStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => { setFlashStates(prev => ({ ...prev, [id]: false })); }, 500);
    onUpdatePortfolio(id, { ...curr, rateDirection: newDirection, annualBudgetRate: newAnnual, quarterlyRates: newQuarterly, monthlyRates: newMonthly, monthlyActualRates: newActuals });
  };

  const handleAdd = (codeOrEvent) => {
    let code = '';
    if (typeof codeOrEvent === 'string') { code = codeOrEvent.toUpperCase(); }
    else {
      if (currencySearch.length > 0) {
        if (ISO_CURRENCIES.includes(currencySearch.toUpperCase())) { code = currencySearch.toUpperCase(); }
        else if (filteredCurrencies.length > 0) { code = filteredCurrencies[0]; }
      }
    }
    if (code && code.length === 3 && ISO_CURRENCIES.includes(code) && !portfolio.find(c => c.code === code)) {
      onAddCurrency(code); setCurrencySearch(''); setShowCurrencyDropdown(false);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolio));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "fx_portfolio_plan.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadTemplate = () => {
    const volHeaders = months.map(m => `Vol_${m}`);
    const rateHeaders = months.map(m => `Rate_${m}_(USD/LC)`);
    const actHeaders = months.map(m => `Actual_${m}_(USD/LC)`);
    const headers = ['CurrencyCode', ...volHeaders, ...rateHeaders, ...actHeaders];
    const rows = [headers.join(',')];
    portfolio.forEach(curr => {
      const volumes = curr.monthlyVolumes.map(v => Math.round(v));
      const rates = curr.monthlyRates.map(r => {
        if (curr.rateDirection === 'USD_PER_LOCAL') return r.toFixed(6);
        return (r !== 0 ? (1 / r).toFixed(6) : 0);
      });
      const actuals = curr.monthlyActualRates.map(r => {
        if (curr.rateDirection === 'USD_PER_LOCAL') return r.toFixed(6);
        return (r !== 0 ? (1 / r).toFixed(6) : 0);
      });
      rows.push([curr.code, ...volumes, ...rates, ...actuals].join(','));
    });
    if (portfolio.length === 0) {
      const exampleVols = Array(12).fill(10000);
      const exampleRates = Array(12).fill(1.1);
      rows.push(["EUR", ...exampleVols, ...exampleRates, ...exampleRates].join(','));
    }
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "fx_planner_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportClick = () => { fileInputRef.current.click(); };

  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const importedData = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 25) continue;
        const code = cols[0].toUpperCase();
        if (!ISO_CURRENCIES.includes(code)) continue;
        const volumes = cols.slice(1, 13).map(Number);
        const ratesRaw = cols.slice(13, 25).map(Number);
        const actualsRaw = cols.length > 25 ? cols.slice(25, 37).map(Number) : ratesRaw;
        importedData.push({ code, volumes, ratesRaw, actualsRaw });
      }
      onBulkImport(importedData);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleDeleteClick = (id) => {
    if (isConfirmingDelete === id) { onRemoveCurrency(id); setIsConfirmingDelete(null); }
    else { setIsConfirmingDelete(id); setTimeout(() => setIsConfirmingDelete(null), 3000); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 lg:p-8">
      <div className={`w-full max-w-7xl h-[90vh] flex flex-col ${theme.card} rounded-xl shadow-2xl border ${darkMode ? 'border-white/20' : 'border-gray-300'} overflow-hidden`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-4">
            <Layers size={24} className={theme.accent} />
            <h2 className="text-2xl font-bold font-mono tracking-tight text-white">INTEGRATED PLANNER</h2>
            <div className="flex bg-white/5 rounded-lg border border-white/10 ml-8">
              <button onClick={setViewAnnual} className={`px-3 py-1 text-xs font-mono transition-colors border-r border-white/10 ${!expandedYear ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'}`}>ANN</button>
              <button onClick={setViewQuarterly} className={`px-3 py-1 text-xs font-mono transition-colors border-r border-white/10 ${(expandedYear && !expandedQuarters[0]) ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'}`}>QTR</button>
              <button onClick={setViewMonthly} className={`px-3 py-1 text-xs font-mono transition-colors ${(expandedYear && expandedQuarters[0]) ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'}`}>MTH</button>
            </div>
            <div className="flex items-center bg-white/5 rounded px-2 border border-white/10 ml-4">
              <button onClick={() => setPlanningYear(planningYear - 1)} className="p-2 hover:text-emerald-400 text-white">&lt;</button>
              <span className="font-mono font-bold mx-2 text-white">{planningYear}</span>
              <button onClick={() => setPlanningYear(planningYear + 1)} className="p-2 hover:text-emerald-400 text-white">&gt;</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportFile} accept=".csv" />
            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors"><FileSpreadsheet size={14} /> TEMPLATE</button>
            <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors"><Upload size={14} /> IMPORT</button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors"><Download size={14} /> EXPORT</button>
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            <button onClick={onClose} className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200 transition-colors">CLOSE</button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-auto p-6 custom-scrollbar bg-black/20">
          {/* VOLUME TABLE */}
          <div className="mb-12">
            <h3 className="font-mono text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2"><Activity size={16} /> VOLUME PLAN (LOCAL CURRENCY)</h3>
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#18181b] z-20 shadow-sm">
                <tr className="border-b border-white/20">
                  <th className="p-3 font-mono text-xs opacity-70 w-56 text-white">CURRENCY</th>
                  <th className="p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 text-white">
                    <div className="flex items-center justify-center gap-2"><span>{planningYear} TOTAL</span><button onClick={() => setExpandedYear(!expandedYear)} className="hover:text-emerald-400 transition-colors">{expandedYear ? <MinusSquare size={14} /> : <PlusSquare size={14} />}</button></div>
                  </th>
                  {expandedYear && quarters.map((q, qIndex) => (
                    <React.Fragment key={q}>
                      <th className="p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 min-w-[100px] text-white">
                        <div className="flex items-center justify-center gap-2"><span>{q}</span><button onClick={() => { const newQ = [...expandedQuarters]; newQ[qIndex] = !newQ[qIndex]; setExpandedQuarters(newQ); }} className="hover:text-emerald-400 transition-colors">{expandedQuarters[qIndex] ? <MinusSquare size={12} /> : <PlusSquare size={12} />}</button></div>
                      </th>
                      {expandedQuarters[qIndex] && [0, 1, 2].map(offset => (<th key={months[qIndex * 3 + offset]} className="p-3 font-mono text-xs text-center border-l border-white/10 min-w-[80px] opacity-70 text-white">{months[qIndex * 3 + offset].toUpperCase()}</th>))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.map(curr => (
                  <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-3 font-bold font-mono text-white border-r border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDeleteClick(curr.id)} className={`p-1 rounded transition-colors mr-1 ${isConfirmingDelete === curr.id ? 'bg-red-500 text-white' : 'text-white/20 hover:text-red-500 hover:bg-white/10'}`} disabled={curr.code === 'USD'}><Trash2 size={12} /></button>
                        <FlagIcon code={curr.code} /><span>{curr.code}</span>
                      </div>
                      <span className="text-xs opacity-30 font-normal">VOL</span>
                    </td>
                    <td className="p-2 border-l border-white/10 bg-white/5"><FormattedInput value={Math.round(getTotalVolume(curr.monthlyVolumes))} onChange={(val) => handleVolumeYearUpdate(curr.id, val)} className="w-full bg-transparent text-center font-bold outline-none text-emerald-400" /></td>
                    {expandedYear && quarters.map((q, qIndex) => (
                      <React.Fragment key={q}>
                        <td className="p-2 border-l border-white/10 bg-white/5"><FormattedInput value={Math.round(getQuarterVolume(curr.monthlyVolumes, qIndex))} onChange={(val) => handleVolumeQuarterUpdate(curr.id, qIndex, val)} className="w-full bg-transparent text-center font-mono text-xs outline-none text-emerald-300/80 focus:text-emerald-400" /></td>
                        {expandedQuarters[qIndex] && [0, 1, 2].map(offset => (<td key={offset} className="p-2 border-l border-white/10"><FormattedInput value={Math.round(curr.monthlyVolumes[qIndex * 3 + offset])} onChange={(val) => handleVolumeMonthUpdate(curr.id, qIndex * 3 + offset, val)} className="w-full bg-transparent text-center font-mono text-xs text-white/50 focus:text-white outline-none" /></td>))}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-3 border-r border-white/10 relative">
                    <div className="flex items-center gap-2 pl-7">
                      <div className="relative">
                        <input placeholder="ADD..." value={currencySearch} onChange={(e) => { setCurrencySearch(e.target.value.toUpperCase()); setShowCurrencyDropdown(true); }} onFocus={() => setShowCurrencyDropdown(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleAdd(null); } }} className="w-20 bg-white/10 p-1.5 rounded text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-400 text-white placeholder-white/30" maxLength={3} />
                        {showCurrencyDropdown && currencySearch.length > 0 && (<div className="absolute top-full left-0 mt-1 w-32 bg-[#18181b] border border-white/20 rounded shadow-xl max-h-40 overflow-y-auto z-50 custom-scrollbar">{filteredCurrencies.map(c => (<button key={c} onClick={() => handleAdd(c)} className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-emerald-500/20 hover:text-emerald-400">{c}</button>))}</div>)}
                      </div>
                      <button onClick={() => handleAdd(null)} className="p-1 hover:text-emerald-400"><Plus size={16} className="text-white/30" /></button>
                    </div>
                  </td><td colSpan={100}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RATE TABLE */}
          <div>
            <h3 className="font-mono text-sm font-bold text-blue-400 mb-4 flex items-center gap-2 border-t border-white/10 pt-8"><DollarSign size={16} /> BUDGET RATE PLAN</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="p-3 font-mono text-xs opacity-70 w-56 text-white">CURRENCY / DIR</th>
                  <th className="p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 text-white"><span>{planningYear} AVG</span></th>
                  {expandedYear && quarters.map((q, qIndex) => (
                    <React.Fragment key={q}>
                      <th className="p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 min-w-[100px] text-white"><span>{q} AVG</span></th>
                      {expandedQuarters[qIndex] && [0, 1, 2].map(offset => (<th key={months[qIndex * 3 + offset]} className="p-3 font-mono text-xs text-center border-l border-white/10 min-w-[80px] opacity-70 text-white">{months[qIndex * 3 + offset].toUpperCase()}</th>))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.map(curr => {
                  if (curr.code === 'USD') return null;
                  return (
                    <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-3 font-bold font-mono border-r border-white/10 flex items-center justify-between text-white pl-10">
                        <div className="flex items-center gap-2"><span><FlagIcon code={curr.code} /> {curr.code}</span><button onClick={() => handleToggleDirection(curr.id)} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Swap Rate Direction"><ArrowLeftRight size={12} /></button></div>
                        <span className={`text-[9px] font-mono font-bold px-1 rounded transition-all duration-500 ${flashStates[curr.id] ? 'bg-emerald-400 text-black scale-110' : 'opacity-30 text-white'}`}>{curr.rateDirection === 'LOCAL_PER_USD' ? `(${curr.code}/USD)` : `(USD/${curr.code})`}</span>
                      </td>
                      <td className="p-2 border-l border-white/10 bg-white/5"><DecimalInput value={curr.annualBudgetRate} onChange={(val) => handleRateYearUpdate(curr.id, val)} className="w-full bg-transparent text-center font-bold outline-none text-blue-400" /></td>
                      {expandedYear && quarters.map((q, qIndex) => (
                        <React.Fragment key={q}>
                          <td className="p-2 border-l border-white/10 bg-white/5"><DecimalInput value={getQuarterRate(curr.monthlyRates, qIndex)} onChange={(val) => handleRateQuarterUpdate(curr.id, qIndex, val)} className="w-full bg-transparent text-center font-mono text-sm outline-none text-blue-300/80 focus:text-blue-400" /></td>
                          {expandedQuarters[qIndex] && [0, 1, 2].map(offset => {
                            const mIndex = qIndex * 3 + offset;
                            return (<td key={mIndex} className="p-2 border-l border-white/10"><DecimalInput value={curr.monthlyRates[mIndex]} onChange={(val) => handleRateMonthUpdate(curr.id, mIndex, val)} className="w-full bg-transparent text-center font-mono text-xs text-white/50 focus:text-white outline-none" /></td>);
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ACTUALS RATE TABLE */}
          <div ref={ratesSectionRef}>
            <div className="flex justify-between items-center mb-4 border-t border-white/10 pt-8">
              <h3 className="font-mono text-sm font-bold text-amber-500 flex items-center gap-2"><DollarSign size={16} /> ACTUAL / FORECAST RATES</h3>
              <div className="flex gap-2">
                <button onClick={handleForecastFillClick} className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors"><Zap size={12} /> FILL FORECAST FROM BUDGET</button>
                <button onClick={handleFetchMarketData} className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors"><RefreshCw size={12} /> FETCH MARKET DATA</button>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="p-3 font-mono text-xs opacity-70 w-56 text-white">CURRENCY / SOURCE</th>
                  {expandedYear && quarters.map((q, qIndex) => (
                    <React.Fragment key={q}>
                      {expandedQuarters[qIndex] && [0, 1, 2].map(offset => (<th key={months[qIndex * 3 + offset]} className="p-3 font-mono text-xs text-center border-l border-white/10 min-w-[80px] opacity-70 text-white">{months[qIndex * 3 + offset].toUpperCase()}</th>))}
                      {!expandedQuarters[qIndex] && <th className="p-3 font-mono text-xs text-center border-l border-white/10 min-w-[100px] text-white">{q} (AVG)</th>}
                    </React.Fragment>
                  ))}
                  {!expandedYear && <th className="p-3 font-mono text-xs text-center border-l border-white/10 min-w-[100px] text-white">YEAR AVG</th>}
                </tr>
              </thead>
              <tbody>
                {portfolio.map(curr => {
                  if (curr.code === 'USD') return null;
                  const isLocalPerUsd = curr.rateDirection === 'LOCAL_PER_USD';
                  return (
                    <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-3 font-bold font-mono border-r border-white/10 flex items-center justify-between text-white pl-10">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2"><span><FlagIcon code={curr.code} /> {curr.code}</span></div>
                          <div className="mt-1"><MiniSourceChip source={curr.rateSource} /></div>
                        </div>
                        <span className="text-xs font-mono font-bold px-1 rounded opacity-30 text-white">{isLocalPerUsd ? `(${curr.code}/USD)` : `(USD/${curr.code})`}</span>
                      </td>
                      {expandedYear ? quarters.map((q, qIndex) => (
                        <React.Fragment key={q}>
                          {expandedQuarters[qIndex] ? [0, 1, 2].map(offset => {
                            const mIndex = qIndex * 3 + offset;
                            const isActual = mIndex <= currentYTDMonth;
                            const source = curr.monthlyRateSources ? curr.monthlyRateSources[mIndex] : 'Manual';
                            return (
                              <td key={mIndex} className="p-2 border-l border-white/10 bg-white/5 relative group/cell">
                                <div className="relative">
                                  <DecimalInput value={curr.monthlyActualRates[mIndex]} onChange={(val) => handleActualMonthUpdate(curr.id, mIndex, val)} className={`w-full bg-transparent text-center font-mono text-sm outline-none ${isActual ? 'text-white font-bold' : 'text-white/40 italic'}`} />
                                  {isActual && <div className="absolute top-0 right-0 w-1 h-1 bg-emerald-500 rounded-full"></div>}
                                  <div className="absolute -bottom-1.5 -right-0 opacity-80 scale-75 origin-bottom-right pointer-events-none"><MiniSourceChip source={source} /></div>
                                </div>
                              </td>
                            );
                          }) : (
                            <td className="p-2 border-l border-white/10">
                              <div className="text-center font-mono text-sm opacity-50">{(curr.monthlyActualRates.slice(qIndex * 3, qIndex * 3 + 3).reduce((a, b) => a + b, 0) / 3).toFixed(4)}</div>
                            </td>
                          )}
                        </React.Fragment>
                      )) : (
                        <td className="p-2 border-l border-white/10">
                          <div className="text-center font-mono text-sm opacity-50">{(curr.monthlyActualRates.reduce((a, b) => a + b, 0) / 12).toFixed(4)}</div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- CURRENCY RATE CARD COMPONENT ---
const CurrencyRateCard = ({ data, onChange, onRemove, theme, darkMode, onToggleDirection, flashState }) => {
  const updateField = (field, value) => onChange(data.id, { ...data, [field]: value });
  const effectiveRate = useMemo(() => {
    if (data.budgetType === 'annual') return data.annualBudgetRate;
    return data.monthlyRates.reduce((a, b) => a + b, 0) / 12;
  }, [data]);
  const effectiveActualRate = useMemo(() => {
    return data.monthlyActualRates.reduce((a, b) => a + b, 0) / 12;
  }, [data]);
  const totalVolume = data.monthlyVolumes.reduce((a, b) => a + b, 0);
  const isBaseCurrency = data.code === 'USD';
  const isLocalPerUsd = data.rateDirection === 'LOCAL_PER_USD';
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);
  const toggleLabel = isLocalPerUsd ? `1 USD = ${effectiveRate.toFixed(2)} ${data.code}` : `1 ${data.code} = ${effectiveRate.toFixed(2)} USD`;
  return (
    <div className={`p-3 rounded-xl border ${theme.card} relative overflow-hidden group transition-all duration-300`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <FlagIcon code={data.code} />
          <span className={`font-bold font-mono text-sm ${theme.accent}`}>{data.code}</span>
          {!isBaseCurrency && (
            <button onClick={() => onToggleDirection(data.id)} className="ml-1 px-1.5 py-0.5 text-[9px] rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5" title="Swap Direction">{toggleLabel}</button>
          )}
        </div>
        {!isBaseCurrency && (
          <button onClick={() => isConfirmingDelete ? onRemove(data.id) : setIsConfirmingDelete(true)} className={`p-1 px-2 rounded text-[9px] font-bold font-mono transition-all ${isConfirmingDelete ? 'bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-500/50 hover:text-red-500'}`}>{isConfirmingDelete ? "SURE?" : <Trash2 size={12} />}</button>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="font-mono text-xs opacity-50 uppercase">Plan Vol</div>
          <div className="text-sm font-mono font-bold text-white/90">{formatCompact(totalVolume)}</div>
        </div>
        {!isBaseCurrency && (
          <>
            <div className="flex justify-between items-center">
              <div className="font-mono text-xs opacity-50 uppercase flex items-center gap-1">
                Budget <span className={`transition-all duration-500 text-[8px] ${flashState ? 'text-emerald-400 scale-110 font-bold' : ''}`}>{isLocalPerUsd ? `(${data.code}/USD)` : `(USD/${data.code})`}</span>
              </div>
              <div className={`text-sm font-bold ${theme.accent}`}>{effectiveRate.toFixed(4)}</div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-white/5">
              <div className="font-mono text-xs opacity-50 uppercase">Act/Fcst Rate (Avg)</div>
              <div className="flex items-center gap-1">
                <div className="text-sm font-mono text-blue-400 font-bold">{effectiveActualRate.toFixed(4)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
export default function FXApp() {
  const [view, setView] = useState('intro');
  const [darkMode, setDarkMode] = useState(true);
  const [hoverState, setHoverState] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState('ANNUAL');
  const [middleChartCurrency, setMiddleChartCurrency] = useState('ALL');
  const [flashStates, setFlashStates] = useState({});
  const [currentYTDMonth, setCurrentYTDMonth] = useState(1);
  const [isAccumulatedForecast, setIsAccumulatedForecast] = useState(false);
  const [highlightMenu, setHighlightMenu] = useState(false);
  const [highlightClose, setHighlightClose] = useState(false);
  const [accVisibleCurrencies, setAccVisibleCurrencies] = useState([]);
  const [displayUnit, setDisplayUnit] = useState(1000);
  const fileInputRefMain = useRef(null);
  const [shouldScrollToRates, setShouldScrollToRates] = useState(false);

  useEffect(() => {
    if (view === 'dashboard') {
      const t1 = setTimeout(() => setHighlightMenu(true), 500);
      const t2 = setTimeout(() => setHighlightMenu(false), 4500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [view]);

  useEffect(() => {
    if (isLeftPanelOpen) {
      setHighlightClose(true);
      const timer = setTimeout(() => setHighlightClose(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLeftPanelOpen]);

  useEffect(() => {
    if (!isVolumeModalOpen) setShouldScrollToRates(false);
  }, [isVolumeModalOpen]);

  const shineStyles = `
    @keyframes shine-swipe {
        0% { transform: translateX(-150%) skewX(-20deg); }
        40% { transform: translateX(150%) skewX(-20deg); }
        100% { transform: translateX(150%) skewX(-20deg); }
    }
    .btn-shine {
        position: relative;
        overflow: hidden;
    }
    .btn-shine::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
        transform: translateX(-150%) skewX(-20deg);
        animation: shine-swipe 3s infinite;
        pointer-events: none;
    }
    .btn-pulse-ring {
        animation: pulse-ring 2s infinite;
        box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
    }
    @keyframes pulse-ring {
        0% { transform: scale(0.98); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
        100% { transform: scale(0.98); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
    }
  `;

  const [portfolio, setPortfolio] = useState([
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
  ]);

  const [hedgePercent, setHedgePercent] = useState(50);

  const addCurrency = (code = 'EUR') => {
    if (portfolio.some(c => c.code === code)) return;
    const newId = Math.max(...portfolio.map(c => c.id), 0) + 1;
    const direction = 'USD_PER_LOCAL';
    const defRate = 1.0;
    setPortfolio([...portfolio, {
      id: newId, code, budgetType: 'annual', annualBudgetRate: defRate,
      quarterlyRates: Array(4).fill(defRate), monthlyRates: Array(12).fill(defRate),
      actualRate: defRate * 1.05, monthlyActualRates: Array(12).fill(defRate * 1.05),
      monthlyVolumes: Array(12).fill(0), isCollapsed: true, rateDirection: direction,
      rateSource: 'UI-Manual', monthlyRateSources: Array(12).fill('UI-Manual')
    }]);
  };

  const removeCurrency = (id) => {
    if (portfolio.length > 1) {
      setPortfolio(portfolio.filter(c => c.id !== id));
      if (middleChartCurrency === portfolio.find(c => c.id === id)?.code) setMiddleChartCurrency('ALL');
    }
  };

  const updateCurrency = (id, newData) => { setPortfolio(portfolio.map(c => c.id === id ? newData : c)); };

  const handleCardToggleDirection = (id) => {
    const curr = portfolio.find(c => c.id === id);
    const newDirection = curr.rateDirection === 'USD_PER_LOCAL' ? 'LOCAL_PER_USD' : 'USD_PER_LOCAL';
    const invert = (v) => (v !== 0 ? 1 / v : 0);
    const newAnnual = invert(curr.annualBudgetRate);
    const newQuarterly = curr.quarterlyRates.map(invert);
    const newMonthly = curr.monthlyRates.map(invert);
    const newActuals = curr.monthlyActualRates.map(invert);
    setFlashStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => { setFlashStates(prev => ({ ...prev, [id]: false })); }, 500);
    updateCurrency(id, { ...curr, rateDirection: newDirection, annualBudgetRate: newAnnual, quarterlyRates: newQuarterly, monthlyRates: newMonthly, monthlyActualRates: newActuals });
  };

  const handleBulkImport = (importedData) => {
    let updatedPortfolio = [...portfolio];
    importedData.forEach(item => {
      const index = updatedPortfolio.findIndex(c => c.code === item.code);
      if (index >= 0) {
        const curr = updatedPortfolio[index];
        let newRates = item.ratesRaw;
        let newActuals = item.actualsRaw || item.ratesRaw;
        if (curr.rateDirection === 'LOCAL_PER_USD') {
          newRates = item.ratesRaw.map(v => (v !== 0 ? 1 / v : 0));
          newActuals = (item.actualsRaw || item.ratesRaw).map(v => (v !== 0 ? 1 / v : 0));
        }
        const avgRate = newRates.reduce((a, b) => a + b, 0) / 12;
        const qRates = [0, 1, 2, 3].map(q => newRates.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0) / 3);
        updatedPortfolio[index] = { ...curr, monthlyVolumes: item.volumes, monthlyRates: newRates, annualBudgetRate: avgRate, quarterlyRates: qRates, monthlyActualRates: newActuals, rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV') };
      } else {
        const newId = Math.max(...updatedPortfolio.map(c => c.id), 0) + 1;
        const direction = 'USD_PER_LOCAL';
        let newRates = item.ratesRaw;
        let newActuals = item.actualsRaw || item.ratesRaw;
        const avgRate = newRates.reduce((a, b) => a + b, 0) / 12;
        const qRates = [0, 1, 2, 3].map(q => newRates.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0) / 3);
        updatedPortfolio.push({ id: newId, code: item.code, budgetType: 'monthly', annualBudgetRate: avgRate, quarterlyRates: qRates, monthlyRates: newRates, actualRate: avgRate, monthlyActualRates: newActuals, monthlyVolumes: item.volumes, isCollapsed: true, rateDirection: direction, rateSource: 'CSV', monthlyRateSources: Array(12).fill('CSV') });
      }
    });
    setPortfolio(updatedPortfolio);
  };

  const handleFillForecastFromBudget = () => {
    setPortfolio(prevPortfolio => prevPortfolio.map(curr => {
      if (curr.code === 'USD') return curr;
      const newSources = [...(curr.monthlyRateSources || Array(12).fill('Manual'))];
      const newActuals = curr.monthlyActualRates.map((actRate, index) => {
        if (index > currentYTDMonth) { newSources[index] = 'Budget'; return curr.monthlyRates[index]; }
        return actRate;
      });
      return { ...curr, monthlyActualRates: newActuals, monthlyRateSources: newSources };
    }));
  };

  const handleImportFileMain = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const importedData = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 25) continue;
        const code = cols[0].toUpperCase();
        if (!ISO_CURRENCIES.includes(code)) continue;
        const volumes = cols.slice(1, 13).map(Number);
        const ratesRaw = cols.slice(13, 25).map(Number);
        const actualsRaw = cols.length > 25 ? cols.slice(25, 37).map(Number) : ratesRaw;
        importedData.push({ code, volumes, ratesRaw, actualsRaw });
      }
      handleBulkImport(importedData);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const toggleAccCurrency = (code) => {
    if (accVisibleCurrencies.length === 0) setAccVisibleCurrencies([code]);
    else if (accVisibleCurrencies.includes(code)) {
      const newVal = accVisibleCurrencies.filter(c => c !== code);
      setAccVisibleCurrencies(newVal);
    } else setAccVisibleCurrencies([...accVisibleCurrencies, code]);
  };

  const getUnitLabel = () => {
    if (displayUnit === 1) return '$';
    if (displayUnit === 1000) return '$k';
    return '$M';
  };

  // --- KPI CALCULATIONS ---
  const kpiData = useMemo(() => {
    let annualBudget = 0; let ytdBudget = 0; let ytdActual = 0; let annualForecast = 0;
    let mtdBudget = 0; let mtdActual = 0;
    portfolio.forEach(curr => {
      let currAnnualBudget = 0; let currYtdBudget = 0; let currYtdActual = 0; let currAnnualForecast = 0;
      let currMtdBudget = 0; let currMtdActual = 0;
      curr.monthlyVolumes.forEach((vol, i) => {
        let bRate = curr.monthlyRates[i] || 1;
        const aRate = curr.monthlyActualRates[i] || 1;
        let mBudget, mActual;
        if (curr.rateDirection === 'USD_PER_LOCAL') { mBudget = vol * bRate; mActual = vol * aRate; }
        else { mBudget = vol / bRate; mActual = vol / aRate; }
        currAnnualBudget += mBudget;
        if (i <= currentYTDMonth) { currYtdBudget += mBudget; currYtdActual += mActual; }
        if (i === currentYTDMonth) { currMtdBudget += mBudget; currMtdActual += mActual; }
        if (i <= currentYTDMonth) { currAnnualForecast += mActual; }
        else {
          let fRate = curr.monthlyActualRates[i] || bRate;
          if (curr.rateDirection === 'USD_PER_LOCAL') { currAnnualForecast += vol * fRate; }
          else { currAnnualForecast += vol / fRate; }
        }
      });
      annualBudget += currAnnualBudget; ytdBudget += currYtdBudget; ytdActual += currYtdActual;
      annualForecast += currAnnualForecast; mtdBudget += currMtdBudget; mtdActual += currMtdActual;
    });
    return { annualBudget, ytdBudget, ytdActual, ytdVariance: ytdBudget - ytdActual, mtdVariance: mtdBudget - mtdActual, annualForecast };
  }, [portfolio, currentYTDMonth]);

  // --- CHART 1 ---
  const expenseChartData = useMemo(() => {
    const data = portfolio.map(curr => {
      let expense = 0;
      curr.monthlyVolumes.forEach((vol, i) => {
        if (viewMode === 'YTD' && i > currentYTDMonth) return;
        const bRate = curr.monthlyRates[i] || 1;
        let mBudget = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * bRate : vol / bRate;
        expense += mBudget;
      });
      return { code: curr.code, value: expense };
    });
    data.sort((a, b) => b.value - a.value);
    let totalBudgetRef = 0;
    portfolio.forEach(curr => {
      curr.monthlyVolumes.forEach((vol, i) => {
        if (viewMode === 'YTD' && i > currentYTDMonth) return;
        let bRate = curr.monthlyRates[i] || 1;
        let mBudget = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * bRate : vol / bRate;
        totalBudgetRef += mBudget;
      });
    });
    data.push({ code: "Total", value: totalBudgetRef, isRef: true });
    return data;
  }, [portfolio, viewMode, currentYTDMonth]);

  // --- CHART 2 ---
  const impactChartData = useMemo(() => {
    const totalActualExpense = kpiData.ytdActual;
    const totalVariance = kpiData.ytdVariance;
    return portfolio.map(curr => {
      let currActual = 0; let currVar = 0;
      curr.monthlyVolumes.forEach((vol, i) => {
        if (i > currentYTDMonth) return;
        const bRate = curr.monthlyRates[i] || 1;
        const aRate = curr.monthlyActualRates[i] || 1;
        let mBudget = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * bRate : vol / bRate;
        let mActual = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * aRate : vol / aRate;
        currActual += mActual; currVar += (mBudget - mActual);
      });
      const impactVal = (Math.abs(totalVariance) > 1) ? (currVar / totalVariance) : 0;
      return { code: curr.code, share: totalActualExpense ? (currActual / totalActualExpense) : 0, impact: impactVal, rawShare: currActual, rawImpact: currVar };
    }).filter(Boolean).sort((a, b) => b.share - a.share);
  }, [portfolio, kpiData, currentYTDMonth]);

  // --- CHART 3 ---
  const accVarianceData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let runningVariance = {};
    portfolio.forEach(c => runningVariance[c.code] = 0);
    return months.map((m, i) => {
      const monthData = { name: m, total: 0 };
      if (!isAccumulatedForecast && i > currentYTDMonth) return { name: m };
      portfolio.forEach(curr => {
        const vol = curr.monthlyVolumes[i];
        const bRate = curr.monthlyRates[i] || 1;
        let aRate = curr.monthlyActualRates[i] || 1;
        let mBudget = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * bRate : vol / bRate;
        let mActual = (curr.rateDirection === 'USD_PER_LOCAL') ? vol * aRate : vol / aRate;
        const monthlyVar = mBudget - mActual;
        runningVariance[curr.code] += monthlyVar;
        monthData[curr.code] = runningVariance[curr.code];
        monthData.total += runningVariance[curr.code];
      });
      return monthData;
    });
  }, [portfolio, currentYTDMonth, isAccumulatedForecast]);

  // --- RIGHT CHART DATA ---
  const allChartsData = useMemo(() => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const result = { currencies: {} };
    portfolio.forEach(curr => {
      if (curr.code === 'USD') return;
      const isLocalPerUsd = curr.rateDirection === 'LOCAL_PER_USD';
      let dataMin = Infinity; let dataMax = -Infinity;
      const data = months.map((m, i) => {
        const budgetRate = curr.monthlyRates[i];
        const actualRate = curr.monthlyActualRates[i];
        dataMin = Math.min(dataMin, budgetRate, actualRate);
        dataMax = Math.max(dataMax, budgetRate, actualRate);
        return { month: m, budget: budgetRate, actual: actualRate, range: [budgetRate, actualRate] };
      });
      const avgBudget = curr.annualBudgetRate;
      const off = (dataMax - avgBudget) / (dataMax - dataMin);
      const offset = isNaN(off) ? 0 : Math.max(0, Math.min(1, off));
      let topColor, bottomColor;
      if (isLocalPerUsd) { topColor = "#10b981"; bottomColor = "#ef4444"; }
      else { topColor = "#ef4444"; bottomColor = "#10b981"; }
      if (dataMin === dataMax && dataMin !== Infinity) { dataMin = dataMin * 0.95; dataMax = dataMax * 1.05; }
      result.currencies[curr.id] = { data, dataMin, dataMax, offset, topColor, bottomColor };
    });
    return result;
  }, [portfolio]);

  const theme = darkMode ? {
    bg: 'bg-black', text: 'text-slate-100', card: 'bg-zinc-900/50 border-zinc-800', accent: 'text-emerald-400', danger: 'text-rose-500', grid: '#18181b', chartGrid: '#27272a',
    tabActive: 'bg-emerald-400/10 text-emerald-400 border-emerald-400', tabInactive: 'text-slate-500 hover:text-slate-300 border-transparent'
  } : {
    bg: 'bg-gray-50', text: 'text-gray-900', card: 'bg-white border-gray-200 shadow-sm', accent: 'text-blue-600', danger: 'text-red-600', grid: '#e2e8f0', chartGrid: '#e2e8f0',
    tabActive: 'bg-blue-50 text-blue-600 border-blue-600', tabInactive: 'text-gray-500 hover:text-gray-700 border-transparent'
  };

  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; }
    input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `;

  if (view === 'intro') return <ParticleIntro onStart={() => setView('dashboard')} />;

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500 font-sans selection:bg-emerald-400 selection:text-black`}>
      <style>{scrollbarStyles}</style>
      <style>{shineStyles}</style>

      {/* MODALS */}
      <PlanningModal isOpen={isVolumeModalOpen} onClose={() => setIsVolumeModalOpen(false)} portfolio={portfolio} onUpdatePortfolio={updateCurrency} onAddCurrency={addCurrency} onRemoveCurrency={removeCurrency} onBulkImport={handleBulkImport} onFillForecast={handleFillForecastFromBudget} theme={theme} darkMode={darkMode} currentYTDMonth={currentYTDMonth} scrollToRates={shouldScrollToRates} />

      {/* MAIN CONTENT */}
      <div className="pt-6 pb-12 px-4 max-w-[1920px] mx-auto">

        {/* HERO */}
        <div className="mb-12 grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="text-[6vw] leading-[0.8] font-black tracking-tighter uppercase mb-2">
              <span className="block text-[4vw] opacity-70 mb-2">{getMonthName(currentYTDMonth)} YTD FX IMPACT</span>
              Variance
              <span className={`block ${kpiData.ytdVariance < 0 ? theme.danger : theme.accent}`}>
                {formatFinancial(kpiData.ytdVariance, displayUnit)}
              </span>
            </h1>
            <p className="font-mono text-xs opacity-60 tracking-widest mt-2">/// TOTAL PORTFOLIO P&L IMPACT (USD)</p>
          </div>
          <div className="col-span-12 lg:col-span-4 flex flex-col justify-end">
            <div className={`p-4 border-l-4 ${kpiData.ytdVariance < 0 ? 'border-rose-500 bg-rose-500/5' : 'border-emerald-400 bg-emerald-400/5'}`}>
              <div className="font-mono text-[10px] uppercase mb-1 opacity-70">Portfolio Health</div>
              <div className="text-xl font-bold leading-tight">
                {kpiData.ytdVariance < 0 ? <><span className="text-rose-500">OVER BUDGET</span></> : <><span className="text-emerald-400">UNDER BUDGET</span></>}
              </div>
            </div>
          </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-12 gap-6">

          {/* COL 1: LEFT SIDEBAR (Collapsible) */}
          {isLeftPanelOpen && (
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex gap-2">
                  <div onClick={() => setIsLeftPanelOpen(false)} className={`w-12 h-10 flex items-center justify-center rounded-lg border cursor-pointer transition-colors flex-shrink-0 ${darkMode ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-black/10 bg-black/5 hover:bg-black/10'} ${highlightClose ? 'btn-shine btn-pulse-ring' : ''}`} title="Close Sidebar">
                    <PanelLeftClose size={18} className={darkMode ? "text-white/70" : "text-black/70"} />
                  </div>
                  <button onClick={() => setDarkMode(!darkMode)} className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${darkMode ? 'border-white/20 hover:bg-white/10 bg-white/5' : 'border-black/10 hover:bg-black/5 bg-gray-100'}`} title="Toggle Theme">
                    {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                  <div className="flex-grow">
                    <input type="file" ref={fileInputRefMain} style={{ display: 'none' }} onChange={handleImportFileMain} accept=".csv" />
                    <button onClick={() => fileInputRefMain.current.click()} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white transition-colors" title="Import CSV">
                      <Upload size={14} /> IMPORT
                    </button>
                  </div>
                </div>
                <button onClick={() => setIsVolumeModalOpen(true)} className={`w-full py-3 rounded-lg border ${darkMode ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'border-blue-500/50 bg-blue-50 text-blue-600'} font-bold font-mono tracking-widest text-[10px] transition-all flex items-center justify-center gap-2`}>
                  <LayoutDashboard size={14} /> PLAN VOLUMES & RATES
                </button>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border mt-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <button onClick={() => setDisplayUnit(1)} className={`text-xl py-1 rounded font-black tracking-tight transition-colors ${displayUnit === 1 ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50 hover:opacity-100'}`}>$</button>
                  <button onClick={() => setDisplayUnit(1000)} className={`text-xl py-1 rounded font-black tracking-tight transition-colors ${displayUnit === 1000 ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50 hover:opacity-100'}`}>$k</button>
                  <button onClick={() => setDisplayUnit(1000000)} className={`text-xl py-1 rounded font-black tracking-tight transition-colors ${displayUnit === 1000000 ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-50 hover:opacity-100'}`}>$M</button>
                </div>
                <h3 className="font-mono text-xs font-bold tracking-widest opacity-50 px-1 mt-2">EX RATE PLAN</h3>
              </div>
              <div className="space-y-3">
                {portfolio.map((currency) => (
                  <CurrencyRateCard
                    key={currency.id}
                    data={currency}
                    onChange={updateCurrency}
                    onRemove={removeCurrency}
                    onToggleDirection={handleCardToggleDirection}
                    flashState={flashStates[currency.id]}
                    theme={theme}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* COL 2: MIDDLE RESULTS */}
          <div className={`col-span-12 ${isLeftPanelOpen ? 'lg:col-span-5' : 'lg:col-span-8'} space-y-8 transition-all duration-500`}>

            {!isLeftPanelOpen && (
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setIsLeftPanelOpen(true)}
                  className={`flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-500/30 ${highlightMenu ? 'btn-shine btn-pulse-ring' : ''}`}
                >
                  <PanelLeftOpen size={16} /> SHOW MENU
                </button>
                <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                  <button onClick={() => { setIsVolumeModalOpen(true); setShouldScrollToRates(false); }} className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border transition-colors ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-black/5 border-black/10 hover:bg-black/10 text-black'}`}>
                    <LayoutDashboard size={14} /> PLANNER
                  </button>
                </div>
              </div>
            )}

            {/* KPI MATRIX */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border ${theme.card} flex flex-col justify-center col-span-1`}>
                <div className="font-mono text-xs opacity-50 mb-1 uppercase">Annual Budget</div>
                <div className="text-3xl font-black tracking-tight">{formatFinancial(kpiData.annualBudget, displayUnit)}</div>
              </div>
              <div className={`p-3 rounded-xl border ${theme.card} flex flex-col justify-center col-span-1`}>
                <div className="font-mono text-xs opacity-50 mb-1 uppercase">YTD Budget</div>
                <div className="text-3xl font-black tracking-tight">{formatFinancial(kpiData.ytdBudget, displayUnit)}</div>
              </div>
              <div className={`p-3 rounded-xl border ${theme.card} flex flex-col justify-center col-span-1`}>
                <div className="font-mono text-xs opacity-50 mb-1 uppercase">YTD Actual</div>
                <div className="text-3xl font-black tracking-tight">{formatFinancial(kpiData.ytdActual, displayUnit)}</div>
              </div>
              <div className={`p-3 rounded-xl border ${darkMode ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-emerald-500/30 bg-emerald-50'} flex flex-col justify-center`}>
                <div className={`font-mono text-xs mb-1 uppercase font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>YTD Variance</div>
                <div className={`text-3xl font-black tracking-tight ${kpiData.ytdVariance >= 0 ? (darkMode ? theme.accent : 'text-emerald-600') : theme.danger}`}>
                  {formatFinancial(kpiData.ytdVariance, displayUnit)}
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${darkMode ? 'border-emerald-500/30 bg-emerald-900/10' : 'border-emerald-500/30 bg-emerald-50'} flex flex-col justify-center`}>
                <div className={`font-mono text-xs mb-1 uppercase font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>MTD Variance</div>
                <div className={`text-3xl font-black tracking-tight ${kpiData.mtdVariance >= 0 ? (darkMode ? theme.accent : 'text-emerald-600') : theme.danger}`}>
                  {formatFinancial(kpiData.mtdVariance, displayUnit)}
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${theme.card} flex flex-col justify-center`}>
                <div className="font-mono text-xs opacity-50 mb-1 uppercase">Annual Forecast</div>
                <div className="text-3xl font-black tracking-tight">{formatFinancial(kpiData.annualForecast, displayUnit)}</div>
              </div>
            </div>

            {/* YTD CONTROL */}
            <div className={`p-4 rounded-xl border ${theme.card} flex items-center justify-between`}>
              <span className="font-mono text-[10px] font-bold opacity-70">YTD PERIOD</span>
              <div className="flex-grow mx-4">
                <input type="range" min="0" max="11" value={currentYTDMonth} onChange={(e) => setCurrentYTDMonth(Number(e.target.value))} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400" />
              </div>
              <span className="font-mono text-xs font-bold w-12 text-right">{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][currentYTDMonth]}</span>
            </div>

            {/* CHART 1: BUDGET EXPENSES */}
            <div className={`p-5 rounded-xl border ${theme.card} h-[300px]`}>
              <div className="flex justify-between mb-4">
                <h3 className="font-mono text-xs font-bold flex gap-2 items-center"><DollarSign size={14} /> BUDGET EXPENSES (USD)</h3>
                <div className="flex gap-1">
                  <button onClick={() => setViewMode('ANNUAL')} className={`px-2 py-0.5 text-[9px] border rounded ${viewMode === 'ANNUAL' ? 'bg-white text-black border-white' : 'border-white/20'}`}>ANN</button>
                  <button onClick={() => setViewMode('YTD')} className={`px-2 py-0.5 text-[9px] border rounded ${viewMode === 'YTD' ? 'bg-white text-black border-white' : 'border-white/20'}`}>YTD</button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expenseChartData} margin={{ left: 10, right: 60, top: 0, bottom: 20 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.chartGrid} opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatFinancial(v, displayUnit)} />
                  <YAxis type="category" dataKey="code" tick={({ x, y, payload }) => (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-25} y={3} textAnchor="end" fill="#64748b" fontSize={11} fontWeight="bold">{payload.value}</text>
                      {CURRENCY_TO_COUNTRY[payload.value] && <image x={-20} y={-10} width="16" height="12" href={`https://flagcdn.com/w40/${CURRENCY_TO_COUNTRY[payload.value]}.png`} />}
                    </g>
                  )} width={60} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isRef ? '#52525b' : getCurrencyColor(entry.code, index)} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={(v) => formatFinancial(v, displayUnit)} className={`fill-${darkMode ? 'white' : 'black'} font-mono text-[11px]`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* CHART 2: SHARE VS IMPACT */}
            <div className={`p-5 rounded-xl border ${theme.card} min-h-[320px]`}>
              <div className="mb-4">
                <h3 className="font-mono text-xs font-bold mb-1 flex gap-2 items-center"><PieChart size={14} /> ACTUAL YTD SHARE VS % OF TOTAL VARIANCE</h3>
                <div className="text-[10px] opacity-60 -mt-0">Analyze which currencies are driving the variance disproportionately.</div>
                <div className="text-[10px] opacity-50 italic mt-1">If Impact % &gt; Share %, this currency is driving deviation more than its spending weight suggests.</div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impactChartData} barSize={35} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2} />
                    <XAxis dataKey="code" tick={({ x, y, payload }) => (
                      <g transform={`translate(${x},${y})`}>
                        <foreignObject x={-10} y={0} width={20} height={15}>
                          <div className="flex justify-center"><FlagIcon code={payload.value} className="w-4 h-3 rounded-[1px] shadow-sm" /></div>
                        </foreignObject>
                        <text x={0} y={25} dy={0} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight="bold">{payload.value}</text>
                      </g>
                    )} height={40} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip content={<CustomImpactTooltip displayUnit={displayUnit} />} cursor={{ fill: 'transparent' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="share" name="% of Spend" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="impact" name="% of Variance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3: CUMULATIVE VARIANCE */}
            <div className={`p-5 rounded-xl border ${theme.card} h-[380px]`}>
              <div className="flex justify-between mb-4">
                <h3 className="font-mono text-xs font-bold flex gap-2 items-center"><BarChart2 size={14} /> CUMULATIVE VARIANCE</h3>
                <div className="flex items-center gap-4">
                  <div className="flex flex-wrap justify-end gap-1 max-w-[400px]">
                    {portfolio.filter(c => c.code !== 'USD').map((c, idx) => (
                      <button key={c.id} onClick={() => toggleAccCurrency(c.code)} className="px-2 py-0.5 rounded text-[9px] font-mono border transition-all flex items-center gap-1 border-transparent text-white/90 hover:brightness-110" style={{ backgroundColor: getCurrencyColor(c.code, idx), opacity: (accVisibleCurrencies.length === 0 || accVisibleCurrencies.includes(c.code)) ? 1 : 0.2 }}>{c.code}</button>
                    ))}
                  </div>
                  <div className="w-px h-4 bg-white/10 mx-2"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] opacity-50">FORECAST</span>
                    <button onClick={() => setIsAccumulatedForecast(!isAccumulatedForecast)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isAccumulatedForecast ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${isAccumulatedForecast ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={accVarianceData} stackOffset="sign" margin={{ top: 20, right: 0, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatFinancial(v, displayUnit)} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      backgroundColor: darkMode ? '#000' : '#fff',
                      borderColor: darkMode ? '#52525b' : '#e5e7eb',
                      color: darkMode ? '#fff' : '#000',
                      fontSize: '12px',
                      borderRadius: '0.5rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                    formatter={(v) => formatFinancial(v, displayUnit)}
                  />
                  <ReferenceLine y={0} stroke="#666" />
                  {portfolio.filter(c => c.code !== 'USD').map((curr, idx) => {
                    if (accVisibleCurrencies.length > 0 && !accVisibleCurrencies.includes(curr.code)) return null;
                    return (
                      <Bar key={curr.code} dataKey={curr.code} stackId="stack" fill={getCurrencyColor(curr.code, idx)} barSize={32}>
                        <LabelList dataKey={curr.code} position="inside" formatter={(v) => Math.abs(v) > 0 ? formatFinancial(v, displayUnit) : ''} className="fill-white font-bold font-mono text-[9px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ pointerEvents: 'none' }} />
                      </Bar>
                    );
                  })}
                  <Line type="monotone" dataKey="total" stroke="none" isAnimationActive={false}>
                    <LabelList dataKey="total" position="top" content={(props) => <CustomTotalLabel {...props} displayUnit={displayUnit} darkMode={darkMode} />} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* COL 3: RIGHT CHARTS */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className={`flex justify-between items-center mb-0 sticky top-0 z-10 py-2 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
              <h3 className="font-mono text-xs font-bold tracking-widest flex items-center gap-2 opacity-70">
                <Calendar size={14} /> RATE PERFORMANCE
              </h3>
              <button onClick={() => { setIsVolumeModalOpen(true); setShouldScrollToRates(true); }} className={`flex items-center gap-1 text-[9px] font-mono border px-2 py-1 rounded transition-colors ${darkMode ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/5'}`}>
                <Table size={10} /> EDIT RATES
              </button>
            </div>
            <div className="space-y-6">
              {portfolio.map(curr => {
                if (curr.code === 'USD') return null;
                const chartData = allChartsData.currencies[curr.id];
                if (!chartData) return null;
                const { data, dataMin, dataMax, offset, topColor, bottomColor } = chartData;
                return (
                  <div key={curr.id} className={`p-4 rounded-xl border ${theme.card} relative group hover:border-blue-500/50 transition-colors`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <FlagIcon code={curr.code} />
                        <h4 className="text-xs font-bold font-mono text-white/90">{curr.code} RATE TREND</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] opacity-40 font-mono">2026</span>
                        <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono border border-blue-500/20">{curr.rateDirection === 'LOCAL_PER_USD' ? `1 USD = ${curr.code}` : `1 ${curr.code} = USD`}</div>
                        <button onClick={() => handleCardToggleDirection(curr.id)} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Swap Chart Direction"><ArrowLeftRight size={12} /></button>
                      </div>
                    </div>
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`splitColor${curr.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset={offset} stopColor={topColor} stopOpacity={0.8} />
                              <stop offset={offset} stopColor={bottomColor} stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2} />
                          <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
                          <YAxis domain={[dataMin * 0.9, dataMax * 1.1]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(2)} width={40} />
                          <Tooltip content={<CustomRateTooltip darkMode={darkMode} />} cursor={{ stroke: theme.chartGrid, strokeWidth: 1 }} />
                          <Area type="step" dataKey="budget" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Budget Rate" />
                          <Area type="monotone" dataKey="range" stroke="none" fill={`url(#splitColor${curr.id})`} />
                          <Area type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2} fill="none" name="Actual Rate" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
