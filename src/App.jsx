import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, LabelList, ComposedChart, Area, AreaChart, Line
} from 'recharts';
import {
  Activity, DollarSign, Calendar, Layers, ArrowLeftRight, PieChart, BarChart2,
  Download, Upload, FileSpreadsheet, RefreshCw, Table, Zap,
  PanelLeftClose, PanelLeftOpen, Menu, Sun, Moon, Plus, Trash2,
  LayoutDashboard, PlusSquare, MinusSquare, Info, Copy,
  ChevronDown, ChevronRight
} from 'lucide-react';

import { ISO_CURRENCIES, CURRENCY_TO_COUNTRY, getCurrencyColor, DEFAULT_PORTFOLIO } from './constants/currencies';
import { formatCompact, formatFinancial, fmtPct, getMonthName } from './utils/formatters';
import { notify } from './utils/notify';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFxRates } from './hooks/useFxRates';
import { FlagIcon } from './components/shared/FlagIcon';
import { FormattedInput } from './components/shared/FormattedInput';
import { DecimalInput } from './components/shared/DecimalInput';
import { MiniSourceChip } from './components/shared/MiniSourceChip';
import { ConfirmModal } from './components/shared/ConfirmModal';
import { EmptyState } from './components/shared/EmptyState';
import { ScenarioPanel } from './components/scenario/ScenarioPanel';

// ─── CUSTOM CHART TOOLTIPS / LABELS ──────────────────────────────────────────

const CustomTotalLabel = ({ x, y, value, displayUnit, darkMode }) => {
  if (value === undefined || value === null) return null;
  const formatted = formatFinancial(value, displayUnit);
  const isPositive = value >= 0;
  const textColor = isPositive ? '#10b981' : '#ef4444';
  const bgFill = isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
  const borderColor = isPositive ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)';
  const charWidth = 6.5;
  const padding = 16;
  const width = Math.max(48, formatted.length * charWidth + padding);
  const height = 18;
  const rx = 9;
  const labelY = 4; // always pinned near top of chart
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x - width / 2} y={labelY} width={width} height={height} rx={rx}
        fill={bgFill} stroke={borderColor} strokeWidth={1} />
      <text x={x} y={labelY + 12.5} textAnchor="middle" fontSize={9} fontFamily="monospace"
        fontWeight="bold" fill={textColor} letterSpacing="0.02em">{formatted}</text>
    </g>
  );
};

const CustomRateTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-2 border rounded-lg text-xs font-mono shadow-xl ${darkMode ? 'bg-black border-zinc-700 text-white' : 'bg-white border-zinc-200 text-black'}`}>
      <div className="mb-1 opacity-50 font-bold">{label}</div>
      {payload.map((entry, i) => {
        // Hide fill areas, forecast line (duplicate), and null values
        const hidden = ['overRange','underRange','actualForecast'];
        if (hidden.includes(entry.dataKey) || typeof entry.value !== 'number') return null;
        // Show actualHistorical as "Actual Rate"
        const label = entry.dataKey === 'actualHistorical' ? 'Actual Rate' : entry.name;
        return (
          <div key={i} style={{ color: entry.stroke || entry.fill }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
            <span>{label}:</span>
            <span className="font-bold">{entry.value.toFixed(4)}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomImpactTooltip = ({ active, payload, displayUnit, darkMode }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className={`p-3 border shadow-xl rounded-lg text-xs font-mono ${darkMode ? 'bg-black border-zinc-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className={`mb-2 font-bold border-b pb-1 flex items-center gap-2 ${darkMode ? 'border-white/20' : 'border-gray-200'}`}>
        <FlagIcon code={data.code} /> {data.code}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-blue-500">
          <span>Share:</span><span>{formatFinancial(data.rawShare, displayUnit)} ({fmtPct(data.share)})</span>
        </div>
        {data.code !== 'USD' && (
          <div className="flex justify-between gap-4 text-amber-500">
            <span>Impact:</span><span>{formatFinancial(data.rawImpact, displayUnit)} ({fmtPct(data.impact)})</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CURRENCY RATE CARD ──────────────────────────────────────────────────────

const CurrencyRateCard = ({ data, onChange, onRemove, theme, darkMode, onToggleDirection, flashState }) => {
  const effectiveRate = useMemo(() => {
    if (data.budgetType === 'annual') return data.annualBudgetRate;
    return data.monthlyRates.reduce((a, b) => a + b, 0) / 12;
  }, [data]);
  const effectiveActualRate = useMemo(() =>
    data.monthlyActualRates.reduce((a, b) => a + b, 0) / 12, [data]);
  const budgetVolume = data.monthlyVolumes.reduce((a, b) => a + b, 0);
  const planVolume = (data.monthlyActualVolumes ?? data.monthlyVolumes).reduce((a, b) => a + b, 0);
  const isBaseCurrency = data.code === 'USD';
  const isLocalPerUsd = data.rateDirection === 'LOCAL_PER_USD';
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  useEffect(() => {
    if (isConfirmingDelete) {
      const t = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isConfirmingDelete]);
  const toggleLabel = isLocalPerUsd
    ? `1 USD = ${effectiveRate.toFixed(2)} ${data.code}`
    : `1 ${data.code} = ${effectiveRate.toFixed(2)} USD`;
  return (
    <div className={`p-3 rounded-xl border ${theme.card} relative overflow-hidden transition-all duration-300`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <FlagIcon code={data.code} />
          <span className={`font-bold font-mono text-sm ${theme.accent}`}>{data.code}</span>
          {!isBaseCurrency && (
            <button onClick={() => onToggleDirection(data.id)} className={`ml-1 px-1.5 py-0.5 text-[9px] rounded transition-colors border ${darkMode ? 'hover:bg-white/10 text-white/50 hover:text-white border-white/10' : 'hover:bg-black/5 text-gray-400 hover:text-gray-700 border-gray-200'}`} title="Swap Direction">
              {toggleLabel}
            </button>
          )}
        </div>
        {!isBaseCurrency && (
          <button onClick={() => isConfirmingDelete ? onRemove(data.id) : setIsConfirmingDelete(true)} className={`p-1 px-2 rounded text-[9px] font-bold font-mono transition-all ${isConfirmingDelete ? 'bg-red-500 text-white' : 'hover:bg-red-500/20 text-red-500/50 hover:text-red-500'}`}>
            {isConfirmingDelete ? "SURE?" : <Trash2 size={12} />}
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <div className="font-mono text-[10px] opacity-50 uppercase">Budget Vol</div>
          <div className={`text-xs font-mono font-bold ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>{formatCompact(budgetVolume)}</div>
        </div>
        <div className={`flex justify-between items-center pb-1 border-b ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="font-mono text-[10px] opacity-50 uppercase">Plan Vol</div>
          <div className={`text-xs font-mono font-bold ${darkMode ? 'text-white/90' : 'text-gray-800'}`}>{formatCompact(planVolume)}</div>
        </div>
        {!isBaseCurrency && (
          <>
            <div className="flex justify-between items-center">
              <div className="font-mono text-[10px] opacity-50 uppercase flex items-center gap-1">
                Budget <span className={`text-[8px] ${flashState ? 'text-emerald-400 font-bold' : ''}`}>{isLocalPerUsd ? `(${data.code}/USD)` : `(USD/${data.code})`}</span>
              </div>
              <div className="text-xs font-bold text-[#60a5fa]">{effectiveRate.toFixed(4)}</div>
            </div>
            <div className={`flex justify-between items-center pt-1 border-t ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
              <div className="font-mono text-[10px] opacity-50 uppercase">Act/Fcst</div>
              <div className="text-xs font-mono text-amber-500 font-bold">{effectiveActualRate.toFixed(4)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── PLANNING MODAL ──────────────────────────────────────────────────────────

const PlanningModal = ({ isOpen, onClose, portfolio, onUpdatePortfolio, onAddCurrency, onRemoveCurrency, onBulkImport, onFillForecast, onApplyLiveRates, theme, darkMode, currentYTDMonth, scrollToRates, fetchRates, isFetchingRates, lastFetched }) => {
  const ratesSectionRef = useRef(null);
  const [expandedYear, setExpandedYear] = useState(true);
  const [expandedQuarters, setExpandedQuarters] = useState([true, true, true, true]);
  const [planningYear, setPlanningYear] = useState(2026);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [flashStates, setFlashStates] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(null);
  const [showFillConfirm, setShowFillConfirm] = useState(false);
  const [showFetchConfirm, setShowFetchConfirm] = useState(false);
  const fileInputRef = useRef(null);
  const months = useMemo(() => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], []);
  const quarters = useMemo(() => ['Q1','Q2','Q3','Q4'], []);
  const filteredCurrencies = useMemo(() =>
    ISO_CURRENCIES.filter(c => c.includes(currencySearch.toUpperCase()) && !portfolio.find(p => p.code === c)),
    [currencySearch, portfolio]);

  useEffect(() => {
    if (isOpen && scrollToRates && ratesSectionRef.current) {
      setTimeout(() => ratesSectionRef.current.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, scrollToRates]);

  if (!isOpen) return null;

  const getQuarterVolume = (vols, q) => vols.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0);
  const getTotalVolume = (vols) => vols.reduce((a, b) => a + b, 0);
  const getQuarterRate = (rates, q) => rates.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0) / 3;
  const getAnnualRate = (rates) => rates.reduce((a, b) => a + b, 0) / 12;

  const setViewAnnual = () => { setExpandedYear(false); setExpandedQuarters([false,false,false,false]); };
  const setViewQuarterly = () => { setExpandedYear(true); setExpandedQuarters([false,false,false,false]); };
  const setViewMonthly = () => { setExpandedYear(true); setExpandedQuarters([true,true,true,true]); };

  const handleVolumeMonthUpdate = (id, mi, val) => { const c = portfolio.find(x => x.id===id); const v=[...c.monthlyVolumes]; v[mi]=Number(val); onUpdatePortfolio(id, {...c,monthlyVolumes:v}); };
  const handleVolumeQuarterUpdate = (id, qi, val) => { const c=portfolio.find(x=>x.id===id); const vpm=Number(val)/3; const v=[...c.monthlyVolumes]; for(let i=0;i<3;i++) v[qi*3+i]=vpm; onUpdatePortfolio(id,{...c,monthlyVolumes:v}); };
  const handleVolumeYearUpdate = (id, val) => { const c=portfolio.find(x=>x.id===id); onUpdatePortfolio(id,{...c,monthlyVolumes:Array(12).fill(Number(val)/12)}); };
  const handleRateMonthUpdate = (id, mi, val) => { const c=portfolio.find(x=>x.id===id); const r=[...c.monthlyRates]; r[mi]=Number(val); onUpdatePortfolio(id,{...c,monthlyRates:r,annualBudgetRate:getAnnualRate(r),quarterlyRates:quarters.map((_,qi)=>getQuarterRate(r,qi))}); };
  const handleRateQuarterUpdate = (id, qi, val) => { const c=portfolio.find(x=>x.id===id); const v=Number(val); const r=[...c.monthlyRates]; const qr=[...c.quarterlyRates]; qr[qi]=v; for(let i=0;i<3;i++) r[qi*3+i]=v; onUpdatePortfolio(id,{...c,monthlyRates:r,quarterlyRates:qr,annualBudgetRate:getAnnualRate(r)}); };
  const handleRateYearUpdate = (id, val) => { const v=Number(val); const c=portfolio.find(x=>x.id===id); onUpdatePortfolio(id,{...c,annualBudgetRate:v,quarterlyRates:Array(4).fill(v),monthlyRates:Array(12).fill(v),budgetType:'annual'}); };
  const handleActualMonthUpdate = (id, mi, val) => { const c=portfolio.find(x=>x.id===id); const r=[...c.monthlyActualRates]; const s=[...(c.monthlyRateSources||Array(12).fill('Manual'))]; r[mi]=Number(val); s[mi]='UI-Manual'; onUpdatePortfolio(id,{...c,monthlyActualRates:r,monthlyRateSources:s}); };
  const handleActualVolumeMonthUpdate = (id, mi, val) => { const c=portfolio.find(x=>x.id===id); const v=[...(c.monthlyActualVolumes??[...c.monthlyVolumes])]; v[mi]=Number(val); onUpdatePortfolio(id,{...c,monthlyActualVolumes:v}); };
  const handleActualVolumeQuarterUpdate = (id, qi, val) => { const c=portfolio.find(x=>x.id===id); const vpm=Number(val)/3; const v=[...(c.monthlyActualVolumes??[...c.monthlyVolumes])]; for(let i=0;i<3;i++) v[qi*3+i]=vpm; onUpdatePortfolio(id,{...c,monthlyActualVolumes:v}); };
  const handleActualVolumeYearUpdate = (id, val) => { const c=portfolio.find(x=>x.id===id); onUpdatePortfolio(id,{...c,monthlyActualVolumes:Array(12).fill(Number(val)/12)}); };
  const handleCopyToYearEnd = (id, mi, field) => {
    if (mi >= 11) return;
    const c = portfolio.find(x => x.id===id);
    const src = field==='monthlyRates'?c.monthlyRates:field==='monthlyActualRates'?c.monthlyActualRates:field==='monthlyActualVolumes'?(c.monthlyActualVolumes??c.monthlyVolumes):c.monthlyVolumes;
    const arr = [...src]; const val = arr[mi];
    for (let i=mi+1;i<12;i++) arr[i]=val;
    if (field==='monthlyRates') { onUpdatePortfolio(id,{...c,monthlyRates:arr,quarterlyRates:quarters.map((_,qi)=>getQuarterRate(arr,qi)),annualBudgetRate:getAnnualRate(arr)}); }
    else if (field==='monthlyActualVolumes') { onUpdatePortfolio(id,{...c,monthlyActualVolumes:arr}); }
    else if (field==='monthlyActualRates') { onUpdatePortfolio(id,{...c,monthlyActualRates:arr}); }
    else { onUpdatePortfolio(id,{...c,monthlyVolumes:arr}); }
  };

  const handleFetchMarketData = async () => {
    const toastId = notify.loading('Fetching live rates...');
    try {
      const rateData = await fetchRates();
      onApplyLiveRates(rateData);
      notify.dismiss(toastId);
      notify.success('Live rates applied');
    } catch (err) {
      notify.dismiss(toastId);
      notify.error(`Rate fetch failed: ${err.message}`);
    }
  };

  const handleToggleDirection = (id) => {
    const c = portfolio.find(x => x.id===id);
    const inv = v => v!==0?1/v:0;
    const newDir = c.rateDirection==='USD_PER_LOCAL'?'LOCAL_PER_USD':'USD_PER_LOCAL';
    setFlashStates(p=>({...p,[id]:true}));
    setTimeout(()=>setFlashStates(p=>({...p,[id]:false})),500);
    onUpdatePortfolio(id,{...c,rateDirection:newDir,annualBudgetRate:inv(c.annualBudgetRate),quarterlyRates:c.quarterlyRates.map(inv),monthlyRates:c.monthlyRates.map(inv),monthlyActualRates:c.monthlyActualRates.map(inv)});
  };

  const handleAdd = (code) => {
    let finalCode = typeof code==='string' ? code.toUpperCase() : (ISO_CURRENCIES.includes(currencySearch.toUpperCase()) ? currencySearch.toUpperCase() : filteredCurrencies[0] ?? '');
    if (finalCode && finalCode.length===3 && ISO_CURRENCIES.includes(finalCode) && !portfolio.find(c=>c.code===finalCode)) {
      onAddCurrency(finalCode); setCurrencySearch(''); setShowCurrencyDropdown(false);
    }
  };

  const handleExport = () => {
    const volH=months.map(m=>`Vol_${m}`),rateH=months.map(m=>`BudRate_${m}`),actVolH=months.map(m=>`ActVol_${m}`),actRateH=months.map(m=>`ActRate_${m}`);
    const rows=[['Currency',...volH,...rateH,...actVolH,...actRateH].join(',')];
    portfolio.forEach(curr=>{
      const vols=curr.monthlyVolumes.map(v=>Math.round(v));
      const aVols=(curr.monthlyActualVolumes??curr.monthlyVolumes).map(v=>Math.round(v));
      const rates=curr.monthlyRates.map(r=>curr.rateDirection==='USD_PER_LOCAL'?r.toFixed(6):(r!==0?(1/r).toFixed(6):'0'));
      const acts=curr.monthlyActualRates.map(r=>curr.rateDirection==='USD_PER_LOCAL'?r.toFixed(6):(r!==0?(1/r).toFixed(6):'0'));
      rows.push([curr.code,...vols,...rates,...aVols,...acts].join(','));
    });
    const a=document.createElement('a');a.setAttribute('href','data:text/csv;charset=utf-8,'+encodeURIComponent(rows.join('\n')));a.setAttribute('download','fx_portfolio_export.csv');document.body.appendChild(a);a.click();a.remove();
    notify.success('Portfolio exported as CSV');
  };

  const handleDownloadTemplate = () => {
    const ms=months;
    const lines=[
      ['Currency',...ms.map(m=>`Vol_${m}`),...ms.map(m=>`BudRate_${m}`),...ms.map(m=>`ActVol_${m}`),...ms.map(m=>`ActRate_${m}`)].join(','),
    ];
    const a=document.createElement('a');a.setAttribute('href','data:text/csv;charset=utf-8,'+encodeURIComponent(lines.join('\n')));a.setAttribute('download','fx_planner_template.csv');document.body.appendChild(a);a.click();a.remove();
    notify.success('Template downloaded');
  };

  const handleImportFile = (event) => {
    const file=event.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      const lines=e.target.result.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
      const importedData=[];
      for(let i=0;i<lines.length;i++){
        const cols=lines[i].split(','); if(cols.length<13) continue;
        const code=cols[0].toUpperCase(); if(!ISO_CURRENCIES.includes(code)) continue;
        const volumes=cols.slice(1,13).map(Number);
        const ratesRaw=cols.length>=25?cols.slice(13,25).map(Number):Array(12).fill(1);
        const actualVolumes=cols.length>=37?cols.slice(25,37).map(Number):volumes;
        const actualsRaw=cols.length>=49?cols.slice(37,49).map(Number):ratesRaw;
        importedData.push({code,volumes,ratesRaw,actualVolumes,actualsRaw});
      }
      onBulkImport(importedData);
      notify.success(`Imported ${importedData.length} currencies`);
      event.target.value='';
    };
    reader.readAsText(file);
  };

  const handleDeleteClick = (id) => {
    if(isConfirmingDelete===id){onRemoveCurrency(id);setIsConfirmingDelete(null);}
    else{setIsConfirmingDelete(id);setTimeout(()=>setIsConfirmingDelete(null),3000);}
  };

  const lastFetchedLabel = lastFetched
    ? `Updated ${lastFetched.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}` : null;

  return (
    <>
      <ConfirmModal isOpen={showFillConfirm} title="Fill Forecast Rates" message="This will overwrite all future forecast rates with the current Budget Rate for each currency." confirmLabel="FILL FORECAST" danger={false} onConfirm={()=>{onFillForecast();setShowFillConfirm(false);notify.success('Forecast filled from budget');}} onCancel={()=>setShowFillConfirm(false)}/>
      <ConfirmModal isOpen={showFetchConfirm} title="Apply Live Exchange Rates" message={`This will fetch today's live rates and apply them as the Actual Rate for the current YTD month only. Other months will not be changed.`} confirmLabel="APPLY LIVE RATES" danger={false} onConfirm={()=>{setShowFetchConfirm(false);handleFetchMarketData();}} onCancel={()=>setShowFetchConfirm(false)}/>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm sm:p-4 lg:p-8">
        <div className={`w-full sm:max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col rounded-t-xl sm:rounded-xl shadow-2xl border overflow-hidden ${darkMode ? `${theme.card} border-white/20 text-white` : 'bg-white border-gray-200 text-gray-800'}`}>

          {/* Header */}
          <div className={`p-4 sm:p-6 border-b flex flex-wrap gap-3 justify-between items-center flex-shrink-0 ${darkMode?'border-white/10 bg-black/40':'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <Layers size={20} className={theme.accent}/>
              <h2 className="text-base sm:text-2xl font-bold font-mono tracking-tight">INTEGRATED PLANNER</h2>
              <div className={`flex rounded-lg border ${darkMode?'bg-white/5 border-white/10':'bg-gray-100 border-gray-200'}`}>
                <button onClick={setViewAnnual} className={`px-3 py-1 text-xs font-mono border-r ${darkMode?'border-white/10':'border-gray-200'} ${!expandedYear?'bg-white text-black font-bold':(darkMode?'text-white/60 hover:text-white':'text-gray-500 hover:text-gray-900')}`}>ANN</button>
                <button onClick={setViewQuarterly} className={`px-3 py-1 text-xs font-mono border-r ${darkMode?'border-white/10':'border-gray-200'} ${(expandedYear&&!expandedQuarters[0])?'bg-white text-black font-bold':(darkMode?'text-white/60 hover:text-white':'text-gray-500 hover:text-gray-900')}`}>QTR</button>
                <button onClick={setViewMonthly} className={`px-3 py-1 text-xs font-mono ${(expandedYear&&expandedQuarters[0])?'bg-white text-black font-bold':(darkMode?'text-white/60 hover:text-white':'text-gray-500 hover:text-gray-900')}`}>MTH</button>
              </div>
              <div className={`flex items-center rounded px-2 border ${darkMode?'bg-white/5 border-white/10':'bg-gray-100 border-gray-200'}`}>
                <button onClick={()=>setPlanningYear(y=>y-1)} className={`p-1.5 hover:text-emerald-400 ${darkMode?'text-white':'text-gray-600'}`}>&lt;</button>
                <span className="font-mono font-bold mx-2 text-sm">{planningYear}</span>
                <button onClick={()=>setPlanningYear(y=>y+1)} className={`p-1.5 hover:text-emerald-400 ${darkMode?'text-white':'text-gray-600'}`}>&gt;</button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="file" ref={fileInputRef} style={{display:'none'}} onChange={handleImportFile} accept=".csv"/>
              <button onClick={handleDownloadTemplate} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-mono border ${darkMode?'bg-white/5 hover:bg-white/10 border-white/20':'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}><FileSpreadsheet size={13}/><span className="hidden sm:inline">TEMPLATE</span></button>
              <button onClick={()=>fileInputRef.current.click()} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-mono border ${darkMode?'bg-white/5 hover:bg-white/10 border-white/20':'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}><Upload size={13}/><span className="hidden sm:inline">IMPORT</span></button>
              <button onClick={handleExport} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-mono border ${darkMode?'bg-white/5 hover:bg-white/10 border-white/20':'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}><Download size={13}/><span className="hidden sm:inline">EXPORT</span></button>
              <div className={`w-px h-5 ${darkMode?'bg-white/10':'bg-gray-200'}`}/>
              <button onClick={onClose} className="px-3 sm:px-4 py-1.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200">CLOSE</button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className={`flex-grow overflow-auto p-4 sm:p-6 custom-scrollbar ${darkMode?'bg-black/20':''}`}>

            {/* VOLUME TABLE */}
            <div className="mb-12">
              <h3 className="font-mono text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2"><Activity size={16}/> VOLUME PLAN (LOCAL CURRENCY)</h3>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 custom-scrollbar">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead className={`sticky top-0 z-20 ${darkMode?'bg-[#18181b]':'bg-gray-100'}`}>
                    <tr className={`border-b ${darkMode?'border-white/20':'border-gray-200'}`}>
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52">CURRENCY</th>
                      <th className={`p-2 sm:p-3 font-mono text-xs text-center border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-center gap-1.5">{planningYear} TOTAL <button onClick={()=>setExpandedYear(!expandedYear)} className="hover:text-emerald-400">{expandedYear?<MinusSquare size={13}/>:<PlusSquare size={13}/>}</button></div>
                      </th>
                      {expandedYear && quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          {!expandedQuarters[qi] && (
                            <th className={`p-2 sm:p-3 font-mono text-xs text-center border-l min-w-[88px] ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>
                              <div className="flex items-center justify-center gap-1">{q}<button onClick={()=>{const nq=[...expandedQuarters];nq[qi]=!nq[qi];setExpandedQuarters(nq);}} className="hover:text-emerald-400"><PlusSquare size={11}/></button></div>
                            </th>
                          )}
                          {expandedQuarters[qi]&&[0,1,2].map(o=><th key={o} className={`p-2 font-mono text-xs text-center border-l min-w-[68px] opacity-70 ${darkMode?'border-white/10':'border-gray-200'}`}>{months[qi*3+o].toUpperCase()}</th>)}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>(
                      <tr key={curr.id} className={`border-b ${darkMode?'border-white/5 hover:bg-white/5':'border-gray-100 hover:bg-gray-50'}`}>
                        <td className={`p-2 sm:p-3 font-bold font-mono border-r ${darkMode?'border-white/10':'border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button onClick={()=>handleDeleteClick(curr.id)} disabled={curr.code==='USD'} className={`p-0.5 rounded ${isConfirmingDelete===curr.id?'bg-red-500 text-white':(darkMode?'text-white/20 hover:text-red-500 disabled:opacity-0':'text-gray-300 hover:text-red-500 disabled:opacity-0')}`}><Trash2 size={11}/></button>
                              <FlagIcon code={curr.code}/><span className="text-sm">{curr.code}</span>
                            </div>
                            <span className="text-xs opacity-30">VOL</span>
                          </div>
                        </td>
                        <td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><FormattedInput value={Math.round(getTotalVolume(curr.monthlyVolumes))} onChange={v=>handleVolumeYearUpdate(curr.id,v)} className="w-full bg-transparent text-center font-bold outline-none text-emerald-400 text-xs"/></td>
                        {expandedYear&&quarters.map((q,qi)=>(
                          <React.Fragment key={q}>
                            {!expandedQuarters[qi]&&<td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><FormattedInput value={Math.round(getQuarterVolume(curr.monthlyVolumes,qi))} onChange={v=>handleVolumeQuarterUpdate(curr.id,qi,v)} className="w-full bg-transparent text-center font-mono text-xs outline-none text-emerald-300/80"/></td>}
                            {expandedQuarters[qi]&&[0,1,2].map(o=>{const mi=qi*3+o;return(<td key={mi} className={`border-l relative group/vcell ${darkMode?'border-white/10':'border-gray-200'}`}><FormattedInput value={Math.round(curr.monthlyVolumes[mi])} onChange={v=>handleVolumeMonthUpdate(curr.id,mi,v)} className={`p-2 w-full bg-transparent text-center font-mono text-xs outline-none ${darkMode?'text-white/50':'text-gray-500'}`}/>{mi<11&&(<button onMouseDown={e=>{e.preventDefault();handleCopyToYearEnd(curr.id,mi,'monthlyVolumes');}} className="absolute top-0 right-0 z-20 w-[18px] h-[18px] opacity-0 group-focus-within/vcell:opacity-100 bg-emerald-500 hover:bg-emerald-400 text-white rounded-bl-lg flex items-center justify-center text-[9px] transition-opacity cursor-pointer group/copytip">→<span className="absolute bottom-full right-0 mb-1 hidden group-hover/copytip:block whitespace-nowrap text-white text-[9px] px-2 py-1 rounded shadow-xl z-30 font-sans font-normal leading-none pointer-events-none" style={{backgroundColor:'#1e293b'}}>Copy to year end</span></button>)}</td>);})}

                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className={`p-3 border-r ${darkMode?'border-white/10':'border-gray-200'}`}>
                        <div className="flex items-center gap-2 pl-6">
                          <div className="relative">
                            <input placeholder="ADD..." value={currencySearch} onChange={e=>{setCurrencySearch(e.target.value.toUpperCase());setShowCurrencyDropdown(true);}} onFocus={()=>setShowCurrencyDropdown(true)} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();handleAdd(null);}}} className={`w-20 p-1.5 rounded text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-400 ${darkMode?'bg-white/10 text-white placeholder-white/30':'bg-black/5 text-gray-800 placeholder-gray-400'}`} maxLength={3}/>
                            {showCurrencyDropdown&&currencySearch.length>0&&(
                              <div className={`absolute bottom-full left-0 mb-1 w-32 border rounded shadow-xl max-h-40 overflow-y-auto z-[100] custom-scrollbar ${darkMode?'bg-[#18181b] border-white/20':'bg-white border-gray-300 shadow-lg'}`}>
                                {filteredCurrencies.map(c=><button key={c} onClick={()=>handleAdd(c)} className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-emerald-500/20 hover:text-emerald-400 ${darkMode?'text-white':'text-gray-700'}`}>{c}</button>)}
                              </div>
                            )}
                          </div>
                          <button onClick={()=>handleAdd(null)} className={`p-1 hover:text-emerald-400 ${darkMode?'text-white/30':'text-gray-300'}`}><Plus size={15}/></button>
                        </div>
                      </td><td colSpan={100}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* BUDGET RATE TABLE */}
            <div>
              <h3 className={`font-mono text-sm font-bold text-blue-400 mb-4 flex items-center gap-2 border-t pt-8 ${darkMode?'border-white/10':'border-gray-200'}`}><DollarSign size={16}/> BUDGET RATE PLAN</h3>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 custom-scrollbar">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${darkMode?'border-white/20':'border-gray-200'}`}>
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52">CURRENCY / DIR</th>
                      <th className={`p-2 sm:p-3 font-mono text-xs text-center border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>{planningYear} AVG</th>
                      {expandedYear&&quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          {!expandedQuarters[qi]&&<th className={`p-2 sm:p-3 font-mono text-xs text-center border-l min-w-[88px] ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>{q} AVG</th>}
                          {expandedQuarters[qi]&&[0,1,2].map(o=><th key={o} className={`p-2 font-mono text-xs text-center border-l min-w-[68px] opacity-70 ${darkMode?'border-white/10':'border-gray-200'}`}>{months[qi*3+o].toUpperCase()}</th>)}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>{
                      if(curr.code==='USD') return null;
                      return(
                        <tr key={curr.id} className={`border-b ${darkMode?'border-white/5 hover:bg-white/5':'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`p-2 sm:p-3 font-bold font-mono border-r pl-8 ${darkMode?'border-white/10':'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><FlagIcon code={curr.code}/> <span>{curr.code}</span><button onClick={()=>handleToggleDirection(curr.id)} className={`p-0.5 rounded ${darkMode?'hover:bg-white/10 text-white/50 hover:text-white':'hover:bg-black/5 text-gray-400 hover:text-gray-700'}`}><ArrowLeftRight size={11}/></button></div>
                              <span className={`text-[9px] font-mono font-bold px-1 rounded transition-all duration-500 ${flashStates[curr.id]?'bg-emerald-400 text-black':(darkMode?'opacity-30 text-white':'opacity-40 text-gray-600')}`}>{curr.rateDirection==='LOCAL_PER_USD'?`(${curr.code}/USD)`:`(USD/${curr.code})`}</span>
                            </div>
                          </td>
                          <td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><DecimalInput value={curr.annualBudgetRate} onChange={v=>handleRateYearUpdate(curr.id,v)} className="w-full bg-transparent text-center font-bold outline-none text-blue-400 text-xs"/></td>
                          {expandedYear&&quarters.map((q,qi)=>(
                            <React.Fragment key={q}>
                              {!expandedQuarters[qi]&&<td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><DecimalInput value={getQuarterRate(curr.monthlyRates,qi)} onChange={v=>handleRateQuarterUpdate(curr.id,qi,v)} className="w-full bg-transparent text-center font-mono text-xs outline-none text-blue-300/80"/></td>}
                              {expandedQuarters[qi]&&[0,1,2].map(o=>{const mi=qi*3+o;return<td key={mi} className={`border-l relative group/rcell ${darkMode?'border-white/10':'border-gray-200'}`}><DecimalInput value={curr.monthlyRates[mi]} onChange={v=>handleRateMonthUpdate(curr.id,mi,v)} className={`p-2 w-full bg-transparent text-center font-mono text-xs outline-none ${darkMode?'text-white/50':'text-gray-500'}`}/>{mi<11&&(<button onMouseDown={e=>{e.preventDefault();handleCopyToYearEnd(curr.id,mi,'monthlyRates');}} className="absolute top-0 right-0 z-20 w-[18px] h-[18px] opacity-0 group-focus-within/rcell:opacity-100 bg-blue-500 hover:bg-blue-400 text-white rounded-bl-lg flex items-center justify-center text-[9px] transition-opacity cursor-pointer group/copytip">→<span className="absolute bottom-full right-0 mb-1 hidden group-hover/copytip:block whitespace-nowrap text-white text-[9px] px-2 py-1 rounded shadow-xl z-30 font-sans font-normal leading-none pointer-events-none" style={{backgroundColor:'#1e293b'}}>Copy to year end</span></button>)}</td>;})}
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTUAL/FORECAST VOLUME TABLE */}
            <div className="mb-12">
              <h3 className={`font-mono text-sm font-bold text-amber-500 mb-4 flex items-center gap-2 border-t pt-8 ${darkMode?'border-white/10':'border-gray-200'}`}><Activity size={16}/> ACTUAL / FORECAST VOLUME (LOCAL CURRENCY)</h3>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 custom-scrollbar">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead className={`sticky top-0 z-20 ${darkMode?'bg-[#18181b]':'bg-gray-100'}`}>
                    <tr className={`border-b ${darkMode?'border-white/20':'border-gray-200'}`}>
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52">CURRENCY</th>
                      <th className={`p-2 sm:p-3 font-mono text-xs text-center border-l min-w-[90px] ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-center gap-1.5">{planningYear} TOTAL</div>
                      </th>
                      {expandedYear&&quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          {!expandedQuarters[qi]&&<th className={`p-2 sm:p-3 font-mono text-xs text-center border-l min-w-[88px] ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>{q}</th>}
                          {expandedQuarters[qi]&&[0,1,2].map(o=>{const mi=qi*3+o;const isAct=mi<=currentYTDMonth;return<th key={o} className={`p-2 font-mono text-xs text-center border-l min-w-[68px] ${darkMode?'border-white/10':'border-gray-200'} ${isAct?'text-amber-500':'opacity-70'}`}>{months[mi].toUpperCase()}</th>;})}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>{
                      const aVols = curr.monthlyActualVolumes ?? curr.monthlyVolumes;
                      return(
                        <tr key={curr.id} className={`border-b ${darkMode?'border-white/5 hover:bg-white/5':'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`p-2 sm:p-3 font-bold font-mono border-r ${darkMode?'border-white/10':'border-gray-200'}`}>
                            <div className="flex items-center gap-1.5"><FlagIcon code={curr.code}/><span className="text-sm">{curr.code}</span></div>
                          </td>
                          <td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><FormattedInput value={Math.round(aVols.reduce((a,b)=>a+b,0))} onChange={v=>handleActualVolumeYearUpdate(curr.id,v)} className="w-full bg-transparent text-center font-bold outline-none text-amber-500 text-xs font-mono"/></td>
                          {expandedYear&&quarters.map((q,qi)=>(
                            <React.Fragment key={q}>
                              {!expandedQuarters[qi]&&<td className={`p-2 border-l ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}><FormattedInput value={Math.round(aVols.slice(qi*3,qi*3+3).reduce((a,b)=>a+b,0))} onChange={v=>handleActualVolumeQuarterUpdate(curr.id,qi,v)} className="w-full bg-transparent text-center font-mono text-xs outline-none text-amber-400/80"/></td>}
                              {expandedQuarters[qi]&&[0,1,2].map(o=>{
                                const mi=qi*3+o;const isAct=mi<=currentYTDMonth;
                                return(<td key={mi} className={`border-l relative group/avcell ${darkMode?'border-white/10':'border-gray-200'}`}>
                                  <FormattedInput value={Math.round(aVols[mi])} onChange={v=>handleActualVolumeMonthUpdate(curr.id,mi,v)} className={`p-2 w-full bg-transparent text-center font-mono text-xs outline-none ${isAct?'text-amber-500 font-bold':(darkMode?'text-white/40 italic':'text-gray-400 italic')}`}/>
                                  {mi<11&&(<button onMouseDown={e=>{e.preventDefault();handleCopyToYearEnd(curr.id,mi,'monthlyActualVolumes');}} className="absolute top-0 right-0 z-20 w-[18px] h-[18px] opacity-0 group-focus-within/avcell:opacity-100 bg-amber-500 hover:bg-amber-400 text-white rounded-bl-lg flex items-center justify-center text-[9px] transition-opacity cursor-pointer group/copytip">→<span className="absolute bottom-full right-0 mb-1 hidden group-hover/copytip:block whitespace-nowrap text-white text-[9px] px-2 py-1 rounded shadow-xl z-30 font-sans font-normal leading-none pointer-events-none" style={{backgroundColor:'#1e293b'}}>Copy to year end</span></button>)}
                                </td>);
                              })}
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTUALS RATE TABLE */}
            <div ref={ratesSectionRef}>
              <div className={`flex flex-wrap gap-3 justify-between items-center mb-4 border-t pt-8 ${darkMode?'border-white/10':'border-gray-200'}`}>
                <h3 className="font-mono text-sm font-bold text-amber-500 flex items-center gap-2"><DollarSign size={16}/> ACTUAL / FORECAST RATES</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={()=>setShowFillConfirm(true)} className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border ${darkMode?'bg-white/5 hover:bg-white/10 border-white/20':'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}><Zap size={12}/> FILL FORECAST</button>
                  <div className="flex items-center gap-2">
                    {lastFetchedLabel && <span className={`text-[9px] font-mono hidden sm:inline ${darkMode?'text-white/30':'text-gray-400'}`}>{lastFetchedLabel}</span>}
                    <button onClick={()=>setShowFetchConfirm(true)} disabled={isFetchingRates} className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border disabled:opacity-50 ${darkMode?'bg-white/5 hover:bg-white/10 border-white/20':'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'}`}>
                      <RefreshCw size={12} className={isFetchingRates?'animate-spin':''}/> APPLY LIVE RATES
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 custom-scrollbar">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className={`border-b ${darkMode?'border-white/20':'border-gray-200'}`}>
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52">CURRENCY / SOURCE</th>
                      {expandedYear?quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          {expandedQuarters[qi]?[0,1,2].map(o=>{const mi=qi*3+o;const isAct=mi<=currentYTDMonth;return<th key={o} className={`p-2 font-mono text-xs text-center border-l min-w-[68px] ${darkMode?'border-white/10':'border-gray-200'} ${isAct?'text-amber-500':'opacity-70'}`}>{months[mi].toUpperCase()}</th>;}):<th className={`p-2 sm:p-3 font-mono text-xs text-center border-l min-w-[88px] ${darkMode?'border-white/10':'border-gray-200'} opacity-70`}>{q} (AVG)</th>}
                        </React.Fragment>
                      )):<th className={`p-2 sm:p-3 font-mono text-xs text-center border-l ${darkMode?'border-white/10':'border-gray-200'} opacity-70`}>YEAR AVG</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>{
                      if(curr.code==='USD') return null;
                      return(
                        <tr key={curr.id} className={`border-b ${darkMode?'border-white/5 hover:bg-white/5':'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`p-2 sm:p-3 font-bold font-mono border-r pl-8 ${darkMode?'border-white/10':'border-gray-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1"><div className="flex items-center gap-1.5"><FlagIcon code={curr.code}/>{curr.code}</div><MiniSourceChip source={curr.rateSource}/></div>
                              <span className="text-[9px] font-mono opacity-30">{curr.rateDirection==='LOCAL_PER_USD'?`(${curr.code}/USD)`:`(USD/${curr.code})`}</span>
                            </div>
                          </td>
                          {expandedYear?quarters.map((q,qi)=>(
                            <React.Fragment key={q}>
                              {expandedQuarters[qi]?[0,1,2].map(o=>{
                                const mi=qi*3+o,isActual=mi<=currentYTDMonth,src=curr.monthlyRateSources?curr.monthlyRateSources[mi]:'Manual';
                                return(
                                  <td key={mi} className={`border-l relative group/arcell ${darkMode?'border-white/10 bg-white/5':'border-gray-200 bg-gray-50'}`}>
                                    <div className="relative p-2">
                                      <DecimalInput value={curr.monthlyActualRates[mi]} onChange={v=>handleActualMonthUpdate(curr.id,mi,v)} className={`w-full bg-transparent text-center font-mono text-xs outline-none ${isActual?'text-amber-500 font-bold':(darkMode?'text-white/40 italic':'text-gray-400 italic')}`}/>
                                      {isActual&&<div className="absolute top-1 right-1 w-1 h-1 bg-amber-500 rounded-full"/>}
                                      <div className="absolute -bottom-1.5 right-0 opacity-80 scale-75 origin-bottom-right pointer-events-none"><MiniSourceChip source={src}/></div>
                                    </div>
                                    {mi<11&&(<button onMouseDown={e=>{e.preventDefault();handleCopyToYearEnd(curr.id,mi,'monthlyActualRates');}} className="absolute top-0 right-0 z-20 w-[18px] h-[18px] opacity-0 group-focus-within/arcell:opacity-100 bg-amber-500 hover:bg-amber-400 text-white rounded-bl-lg flex items-center justify-center text-[9px] transition-opacity cursor-pointer group/copytip">→<span className="absolute bottom-full right-0 mb-1 hidden group-hover/copytip:block whitespace-nowrap text-white text-[9px] px-2 py-1 rounded shadow-xl z-30 font-sans font-normal leading-none pointer-events-none" style={{backgroundColor:'#1e293b'}}>Copy to year end</span></button>)}
                                  </td>
                                );
                              }):<td className={`p-2 border-l ${darkMode?'border-white/10':'border-gray-200'}`}><div className="text-center font-mono text-xs opacity-50">{(curr.monthlyActualRates.slice(qi*3,qi*3+3).reduce((a,b)=>a+b,0)/3).toFixed(4)}</div></td>}
                            </React.Fragment>
                          )):<td className={`p-2 border-l ${darkMode?'border-white/10':'border-gray-200'}`}><div className="text-center font-mono text-xs opacity-50">{(curr.monthlyActualRates.reduce((a,b)=>a+b,0)/12).toFixed(4)}</div></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── INTRO SCREEN ─────────────────────────────────────────────────────────────

const ParticleIntro = ({ onStart }) => {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { setTimeout(() => setIsReady(true), 400); }, []);
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
      <div className={`text-center transition-opacity duration-1000 ${isReady?'opacity-100':'opacity-0'}`}>
        <p className="text-white/40 font-mono text-[10px] tracking-[0.4em] uppercase mb-8">System Initialized</p>
        <button onClick={onStart} className="px-12 py-4 bg-transparent border border-white/20 text-white font-bold tracking-[0.25em] text-xs hover:bg-white hover:text-black transition-all duration-300 uppercase">
          Enter Dashboard
        </button>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function FXApp() {
  const [view, setView] = useState('intro');
  const [darkMode, setDarkMode] = useLocalStorage('fx_darkmode', true);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState('ANNUAL');
  const [flashStates, setFlashStates] = useState({});
  const [currentYTDMonth, setCurrentYTDMonth] = useLocalStorage('fx_ytd_month', 1);
  const [isAccumulatedForecast, setIsAccumulatedForecast] = useState(false);
  const [highlightMenu, setHighlightMenu] = useState(false);
  const [highlightClose, setHighlightClose] = useState(false);
  const [accVisibleCurrencies, setAccVisibleCurrencies] = useState([]);
  const [displayUnit, setDisplayUnit] = useLocalStorage('fx_display_unit', 1000);
  const [shouldScrollToRates, setShouldScrollToRates] = useState(false);
  const [scenarioDeltas, setScenarioDeltas] = useLocalStorage('fx_scenario', {});
  const [scenarioActive, setScenarioActive] = useState(false);
  const [exRatePlanOpen, setExRatePlanOpen] = useState(false);
  const [scenarioPanelOpen, setScenarioPanelOpen] = useState(false);
  const [portfolio, setPortfolio] = useLocalStorage('fx_portfolio_v1', DEFAULT_PORTFOLIO);

  const fileInputRefMain = useRef(null);
  const { fetchRates, isLoading: isFetchingRates, lastFetched } = useFxRates();

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
      const t = setTimeout(() => setHighlightClose(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isLeftPanelOpen]);
  useEffect(() => { if (!isVolumeModalOpen) setShouldScrollToRates(false); }, [isVolumeModalOpen]);

  const shineStyles = `
    @keyframes shine-swipe{0%{transform:translateX(-150%) skewX(-20deg);}40%{transform:translateX(150%) skewX(-20deg);}100%{transform:translateX(150%) skewX(-20deg);}}
    .btn-shine{position:relative;overflow:hidden;}
    .btn-shine::after{content:'';position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent);transform:translateX(-150%) skewX(-20deg);animation:shine-swipe 3s infinite;pointer-events:none;}
    .btn-pulse-ring{animation:pulse-ring 2s infinite;box-shadow:0 0 0 0 rgba(52,211,153,0.7);}
    @keyframes pulse-ring{0%{transform:scale(0.98);box-shadow:0 0 0 0 rgba(52,211,153,0.7);}70%{transform:scale(1);box-shadow:0 0 0 6px rgba(52,211,153,0);}100%{transform:scale(0.98);box-shadow:0 0 0 0 rgba(52,211,153,0);}}
  `;

  // ── Portfolio mutations ──
  const addCurrency = useCallback((code = 'EUR') => {
    if (portfolio.some(c => c.code === code)) return;
    const newId = Math.max(...portfolio.map(c => c.id), 0) + 1;
    setPortfolio(prev => [...prev, { id:newId, code, budgetType:'annual', annualBudgetRate:1.0, quarterlyRates:Array(4).fill(1.0), monthlyRates:Array(12).fill(1.0), actualRate:1.05, monthlyActualRates:Array(12).fill(1.05), monthlyVolumes:Array(12).fill(0), monthlyActualVolumes:Array(12).fill(0), isCollapsed:true, rateDirection:'USD_PER_LOCAL', rateSource:'UI-Manual', monthlyRateSources:Array(12).fill('UI-Manual') }]);
  }, [portfolio, setPortfolio]);

  const removeCurrency = useCallback((id) => {
    if (portfolio.length > 1) setPortfolio(prev => prev.filter(c => c.id !== id));
  }, [portfolio, setPortfolio]);

  const updateCurrency = useCallback((id, newData) => {
    setPortfolio(prev => prev.map(c => c.id === id ? newData : c));
  }, [setPortfolio]);

  const handleCardToggleDirection = useCallback((id) => {
    const curr = portfolio.find(c => c.id === id);
    const inv = v => v !== 0 ? 1/v : 0;
    const newDir = curr.rateDirection === 'USD_PER_LOCAL' ? 'LOCAL_PER_USD' : 'USD_PER_LOCAL';
    setFlashStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setFlashStates(prev => ({ ...prev, [id]: false })), 500);
    updateCurrency(id, { ...curr, rateDirection:newDir, annualBudgetRate:inv(curr.annualBudgetRate), quarterlyRates:curr.quarterlyRates.map(inv), monthlyRates:curr.monthlyRates.map(inv), monthlyActualRates:curr.monthlyActualRates.map(inv) });
  }, [portfolio, updateCurrency]);

  const handleBulkImport = useCallback((importedData) => {
    setPortfolio(prev => {
      let updated = [...prev];
      importedData.forEach(item => {
        const idx = updated.findIndex(c => c.code === item.code);
        const direction = idx >= 0 ? updated[idx].rateDirection : 'USD_PER_LOCAL';
        let newRates = item.ratesRaw, newActuals = item.actualsRaw || item.ratesRaw;
        if (direction === 'LOCAL_PER_USD') { newRates = newRates.map(v=>v!==0?1/v:0); newActuals = newActuals.map(v=>v!==0?1/v:0); }
        const avgRate = newRates.reduce((a,b)=>a+b,0)/12;
        const qRates = [0,1,2,3].map(q=>newRates.slice(q*3,q*3+3).reduce((a,b)=>a+b,0)/3);
        const newActVols = item.actualVolumes ?? item.volumes;
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], monthlyVolumes:item.volumes, monthlyActualVolumes:newActVols, monthlyRates:newRates, annualBudgetRate:avgRate, quarterlyRates:qRates, monthlyActualRates:newActuals, rateSource:'CSV', monthlyRateSources:Array(12).fill('CSV') };
        } else {
          const newId = Math.max(...updated.map(c=>c.id),0)+1;
          updated.push({ id:newId, code:item.code, budgetType:'monthly', annualBudgetRate:avgRate, quarterlyRates:qRates, monthlyRates:newRates, actualRate:avgRate, monthlyActualRates:newActuals, monthlyVolumes:item.volumes, monthlyActualVolumes:newActVols, isCollapsed:true, rateDirection:direction, rateSource:'CSV', monthlyRateSources:Array(12).fill('CSV') });
        }
      });
      return updated;
    });
  }, [setPortfolio]);

  const handleFillForecastFromBudget = useCallback(() => {
    setPortfolio(prev => prev.map(curr => {
      if (curr.code === 'USD') return curr;
      const newSources = [...(curr.monthlyRateSources||Array(12).fill('Manual'))];
      const newActuals = curr.monthlyActualRates.map((r,i) => { if(i>currentYTDMonth){newSources[i]='Budget';return curr.monthlyRates[i];} return r; });
      return { ...curr, monthlyActualRates:newActuals, monthlyRateSources:newSources };
    }));
  }, [currentYTDMonth, setPortfolio]);

  const handleApplyLiveRates = useCallback((rateData) => {
    setPortfolio(prev => prev.map(curr => {
      if (curr.code === 'USD') return curr;
      const rawApiRate = rateData[curr.code];
      if (!rawApiRate) return curr;
      const convertedRate = curr.rateDirection === 'USD_PER_LOCAL' ? 1 / rawApiRate : rawApiRate;
      const newActuals = curr.monthlyActualRates.map((r, i) => i === currentYTDMonth ? convertedRate : r);
      const newSources = (curr.monthlyRateSources ?? Array(12).fill('Manual')).map((s, i) => i === currentYTDMonth ? 'API' : s);
      return { ...curr, monthlyActualRates: newActuals, monthlyRateSources: newSources, rateSource: 'API' };
    }));
  }, [setPortfolio, currentYTDMonth]);

  const handleImportFileMain = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
      const importedData = [];
      for (let i=0;i<lines.length;i++) {
        const cols=lines[i].split(','); if(cols.length<13) continue;
        const code=cols[0].toUpperCase(); if(!ISO_CURRENCIES.includes(code)) continue;
        const volumes=cols.slice(1,13).map(Number);
        const ratesRaw=cols.length>=25?cols.slice(13,25).map(Number):Array(12).fill(1);
        const actualVolumes=cols.length>=37?cols.slice(25,37).map(Number):volumes;
        const actualsRaw=cols.length>=49?cols.slice(37,49).map(Number):ratesRaw;
        importedData.push({code,volumes,ratesRaw,actualVolumes,actualsRaw});
      }
      handleBulkImport(importedData);
      notify.success(`Imported ${importedData.length} currencies from CSV`);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  // ── Scenario: derived portfolio ──
  const activePortfolio = useMemo(() => {
    if (!scenarioActive) return portfolio;
    return portfolio.map(curr => {
      if (curr.code === 'USD') return curr;
      const mult = 1 + (scenarioDeltas[curr.code] ?? 0) / 100;
      return { ...curr, annualBudgetRate:curr.annualBudgetRate*mult, monthlyRates:curr.monthlyRates.map(r=>r*mult), monthlyActualRates:curr.monthlyActualRates.map(r=>r*mult), quarterlyRates:curr.quarterlyRates.map(r=>r*mult) };
    });
  }, [portfolio, scenarioDeltas, scenarioActive]);

  // ── KPI ──
  const calcKpi = useCallback((port) => {
    let annualBudget=0,ytdBudget=0,ytdActual=0,ytdActualInBudgetRate=0,annualForecast=0,mtdBudget=0,mtdActual=0,mtdActualInBudgetRate=0;
    port.forEach(curr => {
      const actualVols = curr.monthlyActualVolumes ?? curr.monthlyVolumes;
      curr.monthlyVolumes.forEach((vol,i) => {
        const bRate=curr.monthlyRates[i]||1, aRate=curr.monthlyActualRates[i]||1;
        const aVol = actualVols[i] ?? vol;
        const mBudget = curr.rateDirection==='USD_PER_LOCAL'?vol*bRate:vol/bRate;
        const mActualInBudget = curr.rateDirection==='USD_PER_LOCAL'?aVol*bRate:aVol/bRate;
        const mActual = curr.rateDirection==='USD_PER_LOCAL'?aVol*aRate:aVol/aRate;
        annualBudget += mBudget;
        annualForecast += mActual; // actualVol × actualForecastRate for all months
        if(i<=currentYTDMonth){ytdBudget+=mBudget;ytdActualInBudgetRate+=mActualInBudget;ytdActual+=mActual;}
        if(i===currentYTDMonth){mtdBudget+=mBudget;mtdActualInBudgetRate+=mActualInBudget;mtdActual+=mActual;}
      });
    });
    return{annualBudget,ytdBudget,ytdActualInBudgetRate,ytdActual,ytdVariance:ytdActualInBudgetRate-ytdActual,mtdVariance:mtdActualInBudgetRate-mtdActual,annualForecast};
  },[currentYTDMonth]);

  const kpiData = useMemo(()=>calcKpi(activePortfolio),[activePortfolio,calcKpi]);
  const baseKpiData = useMemo(()=>scenarioActive?calcKpi(portfolio):null,[portfolio,scenarioActive,calcKpi]);

  // ── Chart data ──
  const expenseChartData = useMemo(() => {
    const data = portfolio.map(curr => {
      let expense=0;
      curr.monthlyVolumes.forEach((vol,i)=>{if(viewMode==='YTD'&&i>currentYTDMonth)return;const bRate=curr.monthlyRates[i]||1;expense+=curr.rateDirection==='USD_PER_LOCAL'?vol*bRate:vol/bRate;});
      return{code:curr.code,value:expense};
    });
    data.sort((a,b)=>b.value-a.value);
    data.push({code:"Total",value:data.reduce((s,d)=>s+d.value,0),isRef:true});
    return data;
  },[portfolio,viewMode,currentYTDMonth]);

  const impactChartData = useMemo(()=>{
    const totalActual=kpiData.ytdActual,totalVar=kpiData.ytdVariance;
    return activePortfolio.map(curr=>{
      let cA=0,cV=0;
      curr.monthlyVolumes.forEach((vol,i)=>{if(i>currentYTDMonth)return;const bR=curr.monthlyRates[i]||1,aR=curr.monthlyActualRates[i]||1;const mB=curr.rateDirection==='USD_PER_LOCAL'?vol*bR:vol/bR,mA=curr.rateDirection==='USD_PER_LOCAL'?vol*aR:vol/aR;cA+=mA;cV+=(mB-mA);});
      return{code:curr.code,share:totalActual?(cA/totalActual):0,impact:Math.abs(totalVar)>1?cV/totalVar:0,rawShare:cA,rawImpact:cV};
    }).sort((a,b)=>b.share-a.share);
  },[activePortfolio,kpiData,currentYTDMonth]);

  const accVarianceData = useMemo(()=>{
    const mN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const running={};activePortfolio.forEach(c=>running[c.code]=0);
    return mN.map((m,i)=>{
      if(!isAccumulatedForecast&&i>currentYTDMonth)return{name:m};
      const md={name:m,total:0};
      activePortfolio.forEach(curr=>{const vol=curr.monthlyVolumes[i],bR=curr.monthlyRates[i]||1,aR=curr.monthlyActualRates[i]||1;const mB=curr.rateDirection==='USD_PER_LOCAL'?vol*bR:vol/bR,mA=curr.rateDirection==='USD_PER_LOCAL'?vol*aR:vol/aR;running[curr.code]+=(mB-mA);md[curr.code]=running[curr.code];md.total+=running[curr.code];});
      // positiveTop = sum of positive running values → used to anchor total labels above all bars
      md.positiveTop = activePortfolio.reduce((s,c)=>running[c.code]>0?s+running[c.code]:s, 0);
      return md;
    });
  },[activePortfolio,currentYTDMonth,isAccumulatedForecast]);

  const allChartsData = useMemo(()=>{
    const mL=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const result={currencies:{}};
    portfolio.forEach(curr=>{
      if(curr.code==='USD')return;
      let dMin=Infinity,dMax=-Infinity;
      // USD_PER_LOCAL (1 ILS = x USD): actual > budget = over budget = RED
      // LOCAL_PER_USD (1 USD = x ILS): actual > budget = saving (weaker local = cheaper) = GREEN
      const isLocalPerUsd=curr.rateDirection==='LOCAL_PER_USD';
      const overColor=isLocalPerUsd?'#10b981':'#f87171';
      const underColor=isLocalPerUsd?'#f87171':'#10b981';
      const data=mL.map((m,i)=>{
        const b=curr.monthlyRates[i],a=curr.monthlyActualRates[i];
        dMin=Math.min(dMin,b,a);dMax=Math.max(dMax,b,a);
        const lo=Math.min(b,a),hi=Math.max(b,a);
        return{month:m,budget:b,actual:a,
          overRange:a>b?[lo,hi]:[b,b],   // fills only when actual ABOVE budget
          underRange:a<b?[lo,hi]:[b,b],  // fills only when actual BELOW budget
        };
      });
      if(dMin===dMax&&dMin!==Infinity){dMin*=0.95;dMax*=1.05;}
      result.currencies[curr.id]={data,dataMin:dMin,dataMax:dMax,overColor,underColor};
    });
    return result;
  },[portfolio]);

  const toggleAccCurrency=(code)=>{
    if(accVisibleCurrencies.length===0)setAccVisibleCurrencies([code]);
    else if(accVisibleCurrencies.includes(code))setAccVisibleCurrencies(accVisibleCurrencies.filter(c=>c!==code));
    else setAccVisibleCurrencies([...accVisibleCurrencies,code]);
  };

  // ── Export handlers ──
  const handleExcelExport = async () => {
    const id=notify.loading('Generating Excel...');
    try{const{exportToExcel}=await import('./utils/exportHelpers');await exportToExcel(portfolio);notify.dismiss(id);notify.success('Excel downloaded');}
    catch(err){notify.dismiss(id);notify.error(`Excel failed: ${err.message}`);}
  };
  const handlePdfExport = async (includeRatePlan = true) => {
    const id=notify.loading('Generating PDF...');
    const wasSidebarOpen = isLeftPanelOpen;
    try {
      if (!includeRatePlan && wasSidebarOpen) { setIsLeftPanelOpen(false); await new Promise(r=>setTimeout(r,350)); }
      const{exportToPdf}=await import('./utils/exportHelpers');
      await exportToPdf();
      notify.dismiss(id);notify.success('PDF downloaded');
    } catch(err){notify.dismiss(id);notify.error(`PDF failed: ${err.message}`);}
    finally { if (!includeRatePlan && wasSidebarOpen) setIsLeftPanelOpen(true); }
  };

  // ── Theme ──
  const theme = darkMode ? {
    bg:'bg-black',text:'text-slate-100',card:'bg-zinc-900/50 border-zinc-800',accent:'text-emerald-400',danger:'text-rose-500',chartGrid:'#27272a',
  }:{
    bg:'bg-gradient-to-br from-slate-50 via-white to-blue-50/40',text:'text-slate-900',card:'bg-white border-slate-200 shadow-md',accent:'text-blue-600',danger:'text-red-500',chartGrid:'#cbd5e1',
  };

  const scrollbarStyles=`
    .custom-scrollbar::-webkit-scrollbar{width:4px;height:4px;}
    .custom-scrollbar::-webkit-scrollbar-track{background:transparent;}
    .custom-scrollbar::-webkit-scrollbar-thumb{background-color:${darkMode?'rgba(255,255,255,0.15)':'rgba(0,0,0,0.14)'};border-radius:20px;}
    .custom-scrollbar::-webkit-scrollbar-thumb:hover{background-color:${darkMode?'rgba(255,255,255,0.28)':'rgba(0,0,0,0.26)'};}
    .custom-scrollbar::-webkit-scrollbar-corner{background:transparent;}
    input[type=range]{touch-action:none;}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
    ${!darkMode?`
      .kpi-gradient-blue{background:linear-gradient(135deg,#eff6ff,#fff);}
      .kpi-gradient-indigo{background:linear-gradient(135deg,#eef2ff,#fff);}
      .kpi-gradient-violet{background:linear-gradient(135deg,#f5f3ff,#fff);}
      .kpi-gradient-amber{background:linear-gradient(135deg,#fffbeb,#fff);}
      .kpi-gradient-cyan{background:linear-gradient(135deg,#ecfeff,#fff);}
      .kpi-gradient-emerald{background:linear-gradient(135deg,#ecfdf5,#fff);}
      .kpi-gradient-rose{background:linear-gradient(135deg,#fff1f2,#fff);}
    `:''}
  `;

  const kpiFigureClass = (()=>{
    const metricVals=[kpiData.annualBudget,kpiData.ytdBudget,kpiData.ytdActualInBudgetRate,kpiData.ytdActual,kpiData.annualForecast];
    const maxLen=Math.max(...metricVals.map(v=>formatFinancial(v,displayUnit).length));
    return maxLen>9?'text-base sm:text-lg':'text-lg sm:text-2xl';
  })();

  if (view === 'intro') return <ParticleIntro onStart={() => setView('dashboard')} />;

  return (
    <div id="dashboard-root" className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500 font-sans`}>
      <style>{scrollbarStyles}</style>
      <style>{shineStyles}</style>

      <PlanningModal isOpen={isVolumeModalOpen} onClose={()=>setIsVolumeModalOpen(false)} portfolio={portfolio} onUpdatePortfolio={updateCurrency} onAddCurrency={addCurrency} onRemoveCurrency={removeCurrency} onBulkImport={handleBulkImport} onFillForecast={handleFillForecastFromBudget} onApplyLiveRates={handleApplyLiveRates} theme={theme} darkMode={darkMode} currentYTDMonth={currentYTDMonth} scrollToRates={shouldScrollToRates} fetchRates={fetchRates} isFetchingRates={isFetchingRates} lastFetched={lastFetched}/>

      {/* Mobile top bar */}
      <div className={`sticky top-0 z-20 flex lg:hidden items-center justify-between px-4 py-3 border-b ${darkMode?'bg-black/90 border-white/10':'bg-white/90 border-black/10'} backdrop-blur`}>
        <h1 className="font-mono text-xs font-bold tracking-widest opacity-60">FX DASHBOARD</h1>
        <div className="flex items-center gap-1">
          <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded hover:bg-white/10">{darkMode?<Sun size={16}/>:<Moon size={16}/>}</button>
          <button onClick={()=>setIsLeftPanelOpen(!isLeftPanelOpen)} className="p-2 rounded hover:bg-white/10"><Menu size={18}/></button>
        </div>
      </div>

      <div className="pt-4 pb-12 px-3 sm:px-4 max-w-[1920px] mx-auto">

        {/* HERO */}
        <div className="mb-8 sm:mb-12 grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="text-[clamp(2rem,6vw,5rem)] leading-[0.85] font-black tracking-tighter uppercase mb-2">
              <span className="block text-[clamp(1rem,3.5vw,2.5rem)] opacity-70 mb-2 tracking-[0.08em]">{getMonthName(currentYTDMonth)} YTD FX IMPACT</span>
              Variance
              <span className={`block ${kpiData.ytdVariance<0?theme.danger:theme.accent}`}>
                {formatFinancial(kpiData.ytdVariance, displayUnit)}
              </span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className={`p-4 border-l-4 ${kpiData.ytdVariance<0?'border-rose-500 bg-rose-500/5':'border-emerald-400 bg-emerald-400/5'}`}>
              <div className="font-mono text-[10px] uppercase mb-1 opacity-70">FX Rate Impact</div>
              <div className="text-xl font-bold">{kpiData.ytdVariance<0?<span className="text-rose-500">OVER BUDGET</span>:<span className="text-emerald-400">UNDER BUDGET</span>}</div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-12 gap-3 sm:gap-6">

          {/* LEFT SIDEBAR — organized menu */}
          {isLeftPanelOpen&&(
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-0">
              {/* ── Menu header ── */}
              <div className={`flex items-center justify-between px-3 py-2 mb-2 border-b ${darkMode?'border-white/10':'border-black/10'}`}>
                <span className="font-mono text-[10px] font-bold tracking-widest opacity-40 uppercase">Menu</span>
                <button onClick={()=>setIsLeftPanelOpen(false)} className={`p-1.5 rounded-lg border transition-colors ${darkMode?'border-white/20 bg-white/5 hover:bg-white/10':'border-black/10 bg-black/5 hover:bg-black/10'} ${highlightClose?'btn-shine btn-pulse-ring':''}`} title="Close">
                  <PanelLeftClose size={15} className="opacity-70"/>
                </button>
              </div>

              {/* ── 1. Plan Volumes & Rates ── */}
              <div className="px-2 pb-1">
                <button onClick={()=>setIsVolumeModalOpen(true)} className={`w-full py-2.5 rounded-lg border ${darkMode?'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400':'border-blue-500/50 bg-blue-50 hover:bg-blue-100 text-blue-600'} font-bold font-mono tracking-widest text-[10px] flex items-center justify-center gap-2`}>
                  <LayoutDashboard size={13}/> PLAN VOLUMES & RATES
                </button>
                <div className="mt-1">
                  <input type="file" ref={fileInputRefMain} style={{display:'none'}} onChange={handleImportFileMain} accept=".csv"/>
                  <button onClick={()=>fileInputRefMain.current.click()} className={`w-full flex items-center justify-center gap-2 h-8 rounded-lg text-[10px] font-mono border ${darkMode?'bg-white/5 hover:bg-white/10 border-white/10 text-white/60':'bg-black/5 hover:bg-black/10 border-black/10 text-gray-500'}`}>
                    <Upload size={11}/> IMPORT CSV
                  </button>
                </div>
              </div>

              {/* ── 2. Display ── */}
              <div className={`mx-2 mt-3 mb-1 pb-3 border-b ${darkMode?'border-white/8':'border-black/8'}`}>
                <div className="font-mono text-[9px] font-bold tracking-widest opacity-35 uppercase mb-2 px-1">Display</div>
                {/* Theme row */}
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className={`text-[11px] font-mono ${darkMode?'text-white/60':'text-gray-500'}`}>Theme</span>
                  <button onClick={()=>setDarkMode(!darkMode)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono transition-colors ${darkMode?'border-white/20 bg-white/5 hover:bg-white/10 text-white/80':'border-black/10 bg-black/5 hover:bg-black/10 text-gray-700'}`}>
                    {darkMode?<><Sun size={11}/> Light</>:<><Moon size={11}/> Dark</>}
                  </button>
                </div>
                {/* Currency unit row */}
                <div className="flex items-center justify-between px-1">
                  <span className={`text-[11px] font-mono ${darkMode?'text-white/60':'text-gray-500'}`}>Currency</span>
                  <div className={`flex gap-0.5 p-0.5 rounded-lg border ${darkMode?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                    {[{v:1,l:'$'},{v:1000,l:'$k'},{v:1000000,l:'$M'}].map(({v,l})=>(
                      <button key={v} onClick={()=>setDisplayUnit(v)} className={`px-2.5 py-0.5 rounded font-black text-[11px] tracking-tight transition-colors ${displayUnit===v?(darkMode?'bg-white text-black':'bg-black text-white'):'opacity-40 hover:opacity-80'}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── 3. Download ── */}
              <div className={`mx-2 mt-3 mb-1 pb-3 border-b ${darkMode?'border-white/8':'border-black/8'}`}>
                <div className="font-mono text-[9px] font-bold tracking-widest opacity-35 uppercase mb-2 px-1">Download</div>
                <div className="flex flex-col gap-1">
                  <button onClick={handleExcelExport} className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[10px] font-mono border transition-colors ${darkMode?'bg-white/5 hover:bg-white/10 border-white/10 text-white/80':'bg-black/5 hover:bg-black/10 border-black/10 text-gray-700'}`}>
                    <FileSpreadsheet size={12}/> XLSX
                  </button>
                  <button onClick={()=>handlePdfExport(true)} className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[10px] font-mono border transition-colors ${darkMode?'bg-white/5 hover:bg-white/10 border-white/10 text-white/80':'bg-black/5 hover:bg-black/10 border-black/10 text-gray-700'}`}>
                    <Download size={12}/> PDF <span className="opacity-40 ml-auto">with Ex Rate</span>
                  </button>
                  <button onClick={()=>handlePdfExport(false)} className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg text-[10px] font-mono border transition-colors ${darkMode?'bg-white/5 hover:bg-white/10 border-white/10 text-white/80':'bg-black/5 hover:bg-black/10 border-black/10 text-gray-700'}`}>
                    <Download size={12}/> PDF <span className="opacity-40 ml-auto">without Ex Rate</span>
                  </button>
                </div>
              </div>

              {/* ── 4. Ex Rate Plan (collapsible) ── */}
              <div className={`mx-2 mt-3 mb-1 pb-3 border-b ${darkMode?'border-white/8':'border-black/8'}`}>
                <button onClick={()=>setExRatePlanOpen(v=>!v)} className="w-full flex items-center justify-between px-1 mb-2 group">
                  <span className="font-mono text-[9px] font-bold tracking-widest opacity-35 uppercase group-hover:opacity-60 transition-opacity">Ex Rate Plan</span>
                  {exRatePlanOpen ? <ChevronDown size={13} className="opacity-35 group-hover:opacity-60 transition-opacity"/> : <ChevronRight size={13} className="opacity-35 group-hover:opacity-60 transition-opacity"/>}
                </button>
                {exRatePlanOpen && (
                  <div className="space-y-2 mt-1">
                    {portfolio.map(currency=>(
                      <CurrencyRateCard key={currency.id} data={currency} onChange={updateCurrency} onRemove={removeCurrency} onToggleDirection={handleCardToggleDirection} flashState={flashStates[currency.id]} theme={theme} darkMode={darkMode}/>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 5. What-If Scenario (collapsible) ── */}
              <div className="mx-2 mt-3 mb-1">
                <button onClick={()=>setScenarioPanelOpen(v=>!v)} className="w-full flex items-center justify-between px-1 mb-2 group">
                  <span className="font-mono text-[9px] font-bold tracking-widest opacity-35 uppercase group-hover:opacity-60 transition-opacity">What-If Scenario</span>
                  {scenarioPanelOpen ? <ChevronDown size={13} className="opacity-35 group-hover:opacity-60 transition-opacity"/> : <ChevronRight size={13} className="opacity-35 group-hover:opacity-60 transition-opacity"/>}
                </button>
                {scenarioPanelOpen && (
                  <ScenarioPanel portfolio={portfolio} deltas={scenarioDeltas} onDeltaChange={(code,val)=>setScenarioDeltas(prev=>({...prev,[code]:val}))} active={scenarioActive} onToggle={()=>setScenarioActive(!scenarioActive)} baseKpi={baseKpiData||kpiData} simKpi={kpiData} displayUnit={displayUnit} darkMode={darkMode}/>
                )}
              </div>
            </div>
          )}

          {/* MIDDLE COLUMN */}
          <div className={`col-span-12 ${isLeftPanelOpen?'lg:col-span-5':'lg:col-span-8'} space-y-5 transition-all duration-500`}>

            {!isLeftPanelOpen&&(
              <div className="hidden lg:flex items-center">
                <button onClick={()=>setIsLeftPanelOpen(true)} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border ${darkMode?'text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 border-emerald-500/30':'text-emerald-600 hover:text-emerald-700 border-emerald-500/50'} ${highlightMenu?'btn-shine btn-pulse-ring':''}`}>
                  <PanelLeftOpen size={15}/> MENU
                </button>
              </div>
            )}

            {/* KPI GRID */}
            <div className="space-y-2 sm:space-y-3">
              {/* Variance row */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[
                  {label:'YTD Variance',value:kpiData.ytdVariance,tooltip:'Pure FX impact YTD: actual volumes at budget rate minus actual volumes at actual rate.'},
                  {label:'MTD Variance',value:kpiData.mtdVariance,tooltip:'This month FX impact: actual volumes at budget rate vs actual rate.'},
                ].map(({label,value,tooltip})=>(
                  <div key={label} className={`p-3 rounded-xl border flex flex-col items-center text-center relative ${darkMode?(value>=0?'border-emerald-500/30 bg-emerald-900/10':'border-rose-500/30 bg-rose-900/10'):(value>=0?'border-emerald-400 bg-emerald-50 kpi-gradient-emerald':'border-rose-400 bg-red-50 kpi-gradient-rose')}`}>
                    <div className={`min-h-[2.5rem] flex flex-wrap items-center justify-center gap-1 mb-1 font-mono text-xs uppercase font-bold ${darkMode?(value>=0?'text-emerald-400':'text-rose-400'):(value>=0?'text-emerald-700':'text-rose-700')}`}>
                      {label}
                      <div className="relative group/kpitip">
                        <button className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] leading-none font-bold ${darkMode?'border-white/80 text-white/90 hover:border-white hover:text-white':'border-current text-current'}`}>i</button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/kpitip:block w-48 text-white text-[9px] p-2 rounded-lg shadow-2xl z-50 pointer-events-none text-center leading-relaxed font-normal font-sans" style={{backgroundColor:'#1e293b'}}>{tooltip}</div>
                      </div>
                    </div>
                    <div className={`text-xl sm:text-3xl font-black tracking-tight ${value>=0?(darkMode?'text-emerald-400':'text-emerald-600'):(darkMode?'text-rose-400':'text-rose-600')}`}>
                      {formatFinancial(value,displayUnit)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {[
                  {label:'Annual Budget',value:kpiData.annualBudget,lc:'border-blue-200 bg-blue-50 kpi-gradient-blue',tooltip:'Full year planned spend at budgeted exchange rates.'},
                  {label:'YTD Budget',value:kpiData.ytdBudget,lc:'border-indigo-200 bg-indigo-50 kpi-gradient-indigo',tooltip:'Budget spend through the YTD month at budget rates.'},
                  {label:'YTD Act @ Budget Rate',value:kpiData.ytdActualInBudgetRate,lc:'border-violet-200 bg-violet-50 kpi-gradient-violet',tooltip:'Actual volumes priced at budget rates. Removes FX and isolates volume driven variance.'},
                  {label:'YTD Actual',value:kpiData.ytdActual,lc:'border-amber-200 bg-amber-50 kpi-gradient-amber',deltaVs:kpiData.ytdActualInBudgetRate,tooltip:'Actual spend: actual volumes at actual rates through YTD.'},
                  {label:'Annual Forecast',value:kpiData.annualForecast,lc:'border-cyan-200 bg-cyan-50 kpi-gradient-cyan',showDelta:true,tooltip:'Full year forecast using actual and forecast volumes and rates.'},
                ].map(({label,value,showDelta,deltaVs,lc,tooltip})=>{
                  const pct = showDelta&&kpiData.annualBudget ? (kpiData.annualForecast-kpiData.annualBudget)/kpiData.annualBudget*100 : null;
                  const isSaving = pct!==null&&pct<=0;
                  const ytdPct = deltaVs!=null&&deltaVs ? (value-deltaVs)/deltaVs*100 : null;
                  const ytdSaving = ytdPct!==null&&ytdPct<=0;
                  return(
                    <div key={label} className={`p-3 rounded-xl border flex flex-col items-center text-center ${darkMode?theme.card:lc}`}>
                      <div className="min-h-[2.5rem] flex flex-wrap items-center gap-1 justify-center mb-1 font-mono text-[10px] uppercase">
                        <span className={darkMode?'text-white/50':'text-gray-600 font-semibold'}>{label}</span>
                        <div className="relative group/kpitip2">
                          <button className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] leading-none shrink-0 font-bold ${darkMode?'border-white/80 text-white/90 hover:border-white hover:text-white':'border-gray-500 text-gray-700 hover:border-gray-800 hover:text-gray-900'}`}>i</button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/kpitip2:block w-48 text-white text-[9px] p-2 rounded-lg shadow-2xl z-50 pointer-events-none text-center leading-relaxed font-normal font-sans" style={{backgroundColor:'#1e293b'}}>{tooltip}</div>
                        </div>
                      </div>
                      <div className={`${kpiFigureClass} font-black tracking-tight ${darkMode?'text-white':'text-slate-800'}`}>
                        {formatFinancial(value,displayUnit)}
                      </div>
                      {pct!==null&&(
                        <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-mono font-bold ${isSaving?'text-emerald-500':'text-red-500'}`}>
                          {isSaving
                            ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1 L10 10 M10 10 L10 4 M10 10 L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10 L10 1 M10 1 L10 7 M10 1 L4 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          }
                          {isSaving?`${pct.toFixed(1)}%`:`+${pct.toFixed(1)}%`} vs budget
                        </div>
                      )}
                      {ytdPct!==null&&(
                        <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-mono font-bold ${ytdSaving?'text-emerald-500':'text-red-500'}`}>
                          {ytdSaving
                            ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1 L10 10 M10 10 L10 4 M10 10 L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            : <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 10 L10 1 M10 1 L10 7 M10 1 L4 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          }
                          {ytdSaving?`${ytdPct.toFixed(1)}%`:`+${ytdPct.toFixed(1)}%`} vs @bud
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* YTD PERIOD — tick-timeline selector */}
            <div className={`p-3 sm:p-4 rounded-xl border ${theme.card}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[10px] font-bold opacity-50 tracking-widest">YTD PERIOD</span>
                <span className={`font-mono text-xs font-bold ${theme.accent}`}>{getMonthName(currentYTDMonth).toUpperCase()}</span>
              </div>
              <div className="flex gap-px">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=>(
                  <button key={i} onClick={()=>setCurrentYTDMonth(i)} className="flex-1 flex flex-col items-center gap-1 py-1 rounded group" title={m}>
                    {/* tick mark — taller + glowing on active month */}
                    <div className={`w-0.5 rounded-full transition-all duration-150 ${
                      i===currentYTDMonth
                        ? `h-4 ${darkMode?'bg-emerald-400 shadow-[0_0_5px_2px_rgba(52,211,153,0.5)]':'bg-blue-500 shadow-[0_0_5px_2px_rgba(59,130,246,0.5)]'}`
                        : i<currentYTDMonth
                        ? `h-2.5 ${darkMode?'bg-emerald-500/50':'bg-blue-400/40'}`
                        : `h-2 ${darkMode?'bg-white/15 group-hover:bg-white/35':'bg-black/10 group-hover:bg-black/25'}`
                    }`}/>
                    {/* month letter */}
                    <span className={`text-[10px] font-mono font-bold leading-none transition-colors select-none ${
                      i===currentYTDMonth
                        ? (darkMode?'text-emerald-400':'text-blue-600')
                        : i<currentYTDMonth
                        ? (darkMode?'text-white/40':'text-gray-400')
                        : (darkMode?'text-white/20 group-hover:text-white/50':'text-black/20 group-hover:text-black/50')
                    }`}>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CHART 1 */}
            <div className={`p-4 sm:p-5 rounded-xl border ${theme.card} h-[200px] sm:h-[280px]`}>
              <div className="flex justify-between mb-3">
                <h3 className="font-mono text-xs font-bold flex gap-2 items-center"><DollarSign size={13}/> BUDGET EXPENSES (USD)</h3>
                <div className="flex gap-1">
                  {['ANNUAL','YTD'].map(m=><button key={m} onClick={()=>setViewMode(m)} className={`px-2 py-0.5 text-[9px] border rounded ${viewMode===m?(darkMode?'bg-white text-black border-white':'bg-gray-900 text-white border-gray-900'):(darkMode?'border-white/20 text-white/60':'border-gray-300 text-gray-500')}`}>{m}</button>)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expenseChartData} margin={{left:8,right:55,top:0,bottom:15}} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.chartGrid} opacity={0.2}/>
                  <XAxis type="number" tick={{fontSize:10,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false} tickFormatter={v=>formatFinancial(v,displayUnit)}/>
                  <YAxis type="category" dataKey="code" tick={({x,y,payload})=>{const cc=CURRENCY_TO_COUNTRY[payload.value];const tickFill=darkMode?'#94a3b8':'#374151';return(<g key={payload.value} transform={`translate(${x},${y})`}>{cc&&<foreignObject key={`flag-${payload.value}`} x={-50} y={-5} width={14} height={10} overflow="visible"><img src={`https://flagcdn.com/w40/${cc}.png`} width="14" height="10" alt="" style={{display:'block',borderRadius:'1px'}}/></foreignObject>}<text x={cc?-33:-5} y={4} textAnchor="start" fill={tickFill} fontSize={10} fontWeight="bold">{payload.value}</text></g>);}} width={58} axisLine={false} tickLine={false}/>
                  <Bar dataKey="value" radius={[0,4,4,0]}>
                    {expenseChartData.map((entry,i)=><Cell key={i} fill={entry.isRef?'#52525b':getCurrencyColor(entry.code,i)}/>)}
                    <LabelList dataKey="value" position="right" formatter={v=>formatFinancial(v,displayUnit)} style={{fontSize:10,fill:darkMode?'#fff':'#000',fontFamily:'monospace'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* CHART 2 */}
            <div className={`p-4 sm:p-5 rounded-xl border ${theme.card}`}>
              <div className="mb-3">
                <h3 className="font-mono text-xs font-bold mb-1 flex gap-2 items-center"><PieChart size={13}/> YTD SHARE VS % OF VARIANCE</h3>
                <div className="text-[10px] opacity-50 italic">Impact % &gt; Share % → this currency drives variance disproportionately.</div>
              </div>
              <div className="h-[180px] sm:h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={impactChartData} barSize={28} margin={{top:24,right:8,left:8,bottom:18}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                    <XAxis dataKey="code" tick={({x,y,payload})=>{const cc=CURRENCY_TO_COUNTRY[payload.value];const tickFill=darkMode?'#94a3b8':'#374151';return cc?(<g key={payload.value} transform={`translate(${x},${y})`}><foreignObject x={-20} y={-5} width={14} height={10}><img src={`https://flagcdn.com/w40/${cc}.png`} width="14" height="10" alt="" style={{display:'block',borderRadius:'1px'}}/></foreignObject><text x={-4} y={4} textAnchor="start" fill={tickFill} fontSize={10} fontWeight="bold">{payload.value}</text></g>):(<g key={payload.value} transform={`translate(${x},${y})`}><text x={0} y={4} textAnchor="middle" fill={tickFill} fontSize={10} fontWeight="bold">{payload.value}</text></g>);}} height={18} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
                    <Tooltip content={<CustomImpactTooltip displayUnit={displayUnit} darkMode={darkMode}/>} cursor={{fill:'transparent'}}/>
                    <Legend iconType="circle" wrapperStyle={{fontSize:'11px'}}/>
                    <Bar dataKey="share" name="% of Spend" fill="#3b82f6" radius={[4,4,0,0]}>
                      <LabelList dataKey="share" position="top" formatter={v=>`${(v*100).toFixed(0)}%`} style={{fill:'#3b82f6',fontSize:9,fontFamily:'monospace',fontWeight:'bold'}}/>
                    </Bar>
                    <Bar dataKey="impact" name="% of Variance" fill="#f59e0b" radius={[4,4,0,0]}>
                      <LabelList dataKey="impact" position="top" formatter={v=>`${(v*100).toFixed(0)}%`} style={{fill:'#f59e0b',fontSize:9,fontFamily:'monospace',fontWeight:'bold'}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3 */}
            <div className={`p-4 sm:p-5 rounded-xl border ${theme.card} h-[300px] sm:h-[380px]`}>
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <h3 className="font-mono text-xs font-bold flex gap-2 items-center"><BarChart2 size={13}/> CUMULATIVE VARIANCE</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1">
                    {portfolio.filter(c=>c.code!=='USD').map((c,idx)=>(
                      <button key={c.id} onClick={()=>toggleAccCurrency(c.code)} className="px-1.5 py-0.5 rounded text-[9px] font-mono border-transparent text-white/90" style={{backgroundColor:getCurrencyColor(c.code,idx),opacity:(accVisibleCurrencies.length===0||accVisibleCurrencies.includes(c.code))?1:0.2}}>{c.code}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] opacity-50">FORECAST</span>
                    <button onClick={()=>setIsAccumulatedForecast(!isAccumulatedForecast)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isAccumulatedForecast?'bg-emerald-500':darkMode?'bg-gray-700':'bg-gray-300'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${isAccumulatedForecast?'translate-x-4':'translate-x-0'}`}/>
                    </button>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={accVarianceData} stackOffset="sign" margin={{top:36,right:0,left:0,bottom:22}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false} tickFormatter={v=>formatFinancial(v,displayUnit)}/>
                  <Tooltip cursor={{fill:'transparent'}} contentStyle={{backgroundColor:darkMode?'#000':'#fff',borderColor:darkMode?'#52525b':'#d1d5db',color:darkMode?'#fff':'#111',fontSize:'12px',borderRadius:'0.5rem'}} formatter={v=>formatFinancial(v,displayUnit)}/>
                  <ReferenceLine y={0} stroke="#666"/>
                  {activePortfolio.filter(c=>c.code!=='USD').map((curr,idx)=>{
                    if(accVisibleCurrencies.length>0&&!accVisibleCurrencies.includes(curr.code))return null;
                    return(
                      <Bar key={curr.code} dataKey={curr.code} stackId="stack" fill={getCurrencyColor(curr.code,idx)} barSize={26}>
                        <LabelList dataKey={curr.code} position="inside" formatter={v=>Math.abs(v)>0?formatFinancial(v,displayUnit):''} style={{fill:'white',fontWeight:'bold',fontFamily:'monospace',fontSize:'9px',pointerEvents:'none'}}/>
                      </Bar>
                    );
                  })}
                  {/* Invisible line anchored at top of positive stack — labels float above all bars */}
                  <Line type="monotone" dataKey="positiveTop" stroke="none" isAnimationActive={false} dot={false} legendType="none">
                    <LabelList dataKey="total" position="top" content={props=><CustomTotalLabel {...props} displayUnit={displayUnit} darkMode={darkMode}/>}/>
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <div className={`sticky top-0 lg:top-2 z-10 py-2 ${darkMode?'bg-black':'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-xs font-bold tracking-widest flex items-center gap-2 opacity-70"><Calendar size={13}/> RATE PERFORMANCE</h3>
                <button onClick={()=>{setIsVolumeModalOpen(true);setShouldScrollToRates(true);}} className={`flex items-center gap-1 text-[9px] font-mono border px-2 py-1 rounded ${darkMode?'border-white/20 hover:bg-white/10':'border-black/20 hover:bg-black/5'}`}>
                  <Table size={10}/> EDIT RATES
                </button>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-60">
                  <span className="inline-block w-5 h-[2px] rounded bg-[#60a5fa]"/>Budget
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-60">
                  <span className="inline-block w-5 h-[2px] rounded bg-[#f59e0b]"/>Actual
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-60">
                  <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3"/></svg>Forecast
                </span>
              </div>
            </div>

            {portfolio.filter(c=>c.code!=='USD').length===0&&(
              <EmptyState icon={<Calendar size={28}/>} message="Add currencies in the Planner to see rate trends."/>
            )}

            {portfolio.filter(c=>c.code!=='USD').map(curr=>{
              const chartData=allChartsData.currencies[curr.id];
              if(!chartData)return null;
              const{data,dataMin,dataMax,overColor,underColor}=chartData;
              const curIdx=currentYTDMonth;
              // Split actual into solid historical (≤ YTD) and dashed forecast (≥ YTD)
              const splitData=data.map((d,i)=>({
                ...d,
                actualHistorical:i<=currentYTDMonth?d.actual:null,
                actualForecast:i>=currentYTDMonth?d.actual:null,
              }));
              return(
                <div key={curr.id} className={`p-4 rounded-xl border ${theme.card} hover:border-blue-500/50 transition-colors`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2"><FlagIcon code={curr.code}/><h4 className={`text-xs font-bold font-mono ${darkMode ? 'text-white/90' : 'text-gray-800'}`}>{curr.code} RATE TREND</h4></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] opacity-30 font-mono">2026</span>
                      <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono border border-blue-500/20">{curr.rateDirection==='LOCAL_PER_USD'?`1 USD = ${curr.code}`:`1 ${curr.code} = USD`}</div>
                      <button onClick={()=>handleCardToggleDirection(curr.id)} className={`p-0.5 rounded ${darkMode ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-gray-400 hover:text-gray-700'}`} title="Swap"><ArrowLeftRight size={11}/></button>
                    </div>
                  </div>
                  <div className="h-[140px] sm:h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={splitData} margin={{top:24,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                        <XAxis dataKey="month" tick={{fontSize:8,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false} interval={0}/>
                        <YAxis domain={[dataMin*0.9,dataMax*1.1]} tick={{fontSize:8,fill:darkMode?'#64748b':'#374151'}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(2)} width={34}/>
                        <Tooltip content={<CustomRateTooltip darkMode={darkMode}/>} cursor={{stroke:theme.chartGrid,strokeWidth:1}}/>
                        {/* Coloured fills between the two lines, per-segment */}
                        <Area type="monotone" dataKey="overRange" stroke="none" fill={overColor} fillOpacity={0.18} legendType="none" isAnimationActive={false}/>
                        <Area type="monotone" dataKey="underRange" stroke="none" fill={underColor} fillOpacity={0.18} legendType="none" isAnimationActive={false}/>
                        {/* Budget line – solid blue (#60a5fa = blue-400, matching BUDGET RATE PLAN heading) */}
                        <Area type="monotone" dataKey="budget" stroke="#60a5fa" strokeWidth={2} fill="none" name="Budget Rate">
                          <LabelList dataKey="budget" content={({x,y,value,index})=>{
                            if(index!==curIdx||typeof value!=='number')return null;
                            return <text key="bl" x={x} y={y+14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#60a5fa" fontWeight="bold">{value.toFixed(4)}</text>;
                          }}/>
                        </Area>
                        {/* Actual historical – solid amber (#f59e0b = amber-500, matching ACTUAL/FORECAST RATES heading) */}
                        <Area type="monotone" dataKey="actualHistorical" stroke="#f59e0b" strokeWidth={2} fill="none" name="Actual Rate" connectNulls={false} isAnimationActive={false}>
                          <LabelList dataKey="actualHistorical" content={({x,y,value,index})=>{
                            if(index!==curIdx||typeof value!=='number')return null;
                            return <text key="al" x={x} y={y-8} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#f59e0b" fontWeight="bold">{value.toFixed(4)}</text>;
                          }}/>
                        </Area>
                        {/* Forecast – dashed amber, same color, no extra label */}
                        <Area type="monotone" dataKey="actualForecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" fill="none" legendType="none" connectNulls={false} isAnimationActive={false}/>
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
  );
}
