import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell, LabelList, ComposedChart, Area, AreaChart, Line
} from 'recharts';
import {
  Activity, DollarSign, Calendar, Layers, ArrowLeftRight, PieChart, BarChart2,
  Download, Upload, FileSpreadsheet, RefreshCw, Table, Zap,
  PanelLeftClose, PanelLeftOpen, Menu, Sun, Moon, Plus, Trash2,
  LayoutDashboard, PlusSquare, MinusSquare
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
  const width = 36; const height = 18;
  const isPositive = value >= 0;
  const yOffset = isPositive ? -25 : 8;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect x={x - width / 2} y={y + yOffset} width={width} height={height} rx={2}
        fill={darkMode ? "#000" : "#fff"} stroke={isPositive ? "#10b981" : "#ef4444"} strokeWidth={1}
        filter="url(#labelShadow)" />
      <text x={x} y={y + yOffset + 13} textAnchor="middle" fontSize={9} fontFamily="monospace"
        fontWeight="bold" fill={isPositive ? "#10b981" : "#ef4444"}>{formatted}</text>
    </g>
  );
};

const CustomRateTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`p-2 border rounded-lg text-xs font-mono shadow-xl ${darkMode ? 'bg-black border-zinc-700 text-white' : 'bg-white border-zinc-200 text-black'}`}>
      <div className="mb-1 opacity-50 font-bold">{label}</div>
      {payload.map((entry, i) => {
        if (entry.dataKey === 'range' || typeof entry.value !== 'number') return null;
        return (
          <div key={i} style={{ color: entry.stroke || entry.fill }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
            <span>{entry.name}:</span>
            <span className="font-bold">{entry.value.toFixed(4)}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomImpactTooltip = ({ active, payload, displayUnit }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="p-3 border shadow-xl rounded-lg text-xs font-mono bg-black border-zinc-600 text-white">
      <div className="mb-2 font-bold border-b border-white/20 pb-1 flex items-center gap-2">
        <FlagIcon code={data.code} /> {data.code}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-blue-400">
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
  const totalVolume = data.monthlyVolumes.reduce((a, b) => a + b, 0);
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
            <button onClick={() => onToggleDirection(data.id)} className="ml-1 px-1.5 py-0.5 text-[9px] rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5" title="Swap Direction">
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
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="font-mono text-xs opacity-50 uppercase">Plan Vol</div>
          <div className="text-sm font-mono font-bold text-white/90">{formatCompact(totalVolume)}</div>
        </div>
        {!isBaseCurrency && (
          <>
            <div className="flex justify-between items-center">
              <div className="font-mono text-xs opacity-50 uppercase flex items-center gap-1">
                Budget <span className={`text-[8px] ${flashState ? 'text-emerald-400 font-bold' : ''}`}>{isLocalPerUsd ? `(${data.code}/USD)` : `(USD/${data.code})`}</span>
              </div>
              <div className={`text-sm font-bold ${theme.accent}`}>{effectiveRate.toFixed(4)}</div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-white/5">
              <div className="font-mono text-xs opacity-50 uppercase">Act/Fcst (Avg)</div>
              <div className="text-sm font-mono text-blue-400 font-bold">{effectiveActualRate.toFixed(4)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── PLANNING MODAL ──────────────────────────────────────────────────────────

const PlanningModal = ({ isOpen, onClose, portfolio, onUpdatePortfolio, onAddCurrency, onRemoveCurrency, onBulkImport, onFillForecast, theme, darkMode, currentYTDMonth, scrollToRates, fetchRates, isFetchingRates, lastFetched }) => {
  const ratesSectionRef = useRef(null);
  const [expandedYear, setExpandedYear] = useState(true);
  const [expandedQuarters, setExpandedQuarters] = useState([false, false, false, false]);
  const [planningYear, setPlanningYear] = useState(2026);
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [flashStates, setFlashStates] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(null);
  const [showFillConfirm, setShowFillConfirm] = useState(false);
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

  const handleFetchMarketData = async () => {
    const toastId = notify.loading('Fetching live rates...');
    try {
      const rateData = await fetchRates();
      portfolio.forEach(curr => {
        if (curr.code === 'USD') return;
        const rawApiRate = rateData[curr.code];
        if (!rawApiRate) return;
        const convertedRate = curr.rateDirection === 'USD_PER_LOCAL' ? 1 / rawApiRate : rawApiRate;
        const newActuals = curr.monthlyActualRates.map((r, i) => i <= currentYTDMonth ? convertedRate : r);
        const newSources = (curr.monthlyRateSources ?? Array(12).fill('Manual')).map((s, i) => i <= currentYTDMonth ? 'API' : s);
        onUpdatePortfolio(curr.id, { ...curr, monthlyActualRates: newActuals, monthlyRateSources: newSources, rateSource: 'API' });
      });
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolio));
    const a = document.createElement('a'); a.setAttribute("href",dataStr); a.setAttribute("download","fx_portfolio_plan.json"); document.body.appendChild(a); a.click(); a.remove();
    notify.success('Portfolio exported as JSON');
  };

  const handleDownloadTemplate = () => {
    const volH = months.map(m=>`Vol_${m}`), rateH = months.map(m=>`Rate_${m}_(USD/LC)`), actH = months.map(m=>`Actual_${m}_(USD/LC)`);
    const rows = [['CurrencyCode',...volH,...rateH,...actH].join(',')];
    portfolio.forEach(curr => {
      const vols=curr.monthlyVolumes.map(v=>Math.round(v));
      const rates=curr.monthlyRates.map(r=>curr.rateDirection==='USD_PER_LOCAL'?r.toFixed(6):(r!==0?(1/r).toFixed(6):0));
      const acts=curr.monthlyActualRates.map(r=>curr.rateDirection==='USD_PER_LOCAL'?r.toFixed(6):(r!==0?(1/r).toFixed(6):0));
      rows.push([curr.code,...vols,...rates,...acts].join(','));
    });
    if (!portfolio.length) rows.push(["EUR",...Array(12).fill(10000),...Array(12).fill(1.1),...Array(12).fill(1.1)].join(','));
    const a=document.createElement("a"); a.setAttribute("href","data:text/csv;charset=utf-8,"+encodeURIComponent(rows.join("\n"))); a.setAttribute("download","fx_planner_template.csv"); document.body.appendChild(a); a.click(); a.remove();
  };

  const handleImportFile = (event) => {
    const file=event.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(e)=>{
      const lines=e.target.result.split('\n').map(l=>l.trim()).filter(l=>l);
      const importedData=[];
      for(let i=1;i<lines.length;i++){
        const cols=lines[i].split(','); if(cols.length<25) continue;
        const code=cols[0].toUpperCase(); if(!ISO_CURRENCIES.includes(code)) continue;
        importedData.push({code,volumes:cols.slice(1,13).map(Number),ratesRaw:cols.slice(13,25).map(Number),actualsRaw:cols.length>25?cols.slice(25,37).map(Number):cols.slice(13,25).map(Number)});
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm sm:p-4 lg:p-8">
        <div className={`w-full sm:max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col ${theme.card} rounded-t-xl sm:rounded-xl shadow-2xl border ${darkMode?'border-white/20':'border-gray-300'} overflow-hidden`}>

          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap gap-3 justify-between items-center bg-black/40 flex-shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Layers size={20} className={theme.accent}/>
              <h2 className="text-base sm:text-2xl font-bold font-mono tracking-tight text-white">INTEGRATED PLANNER</h2>
              <div className="flex bg-white/5 rounded-lg border border-white/10">
                <button onClick={setViewAnnual} className={`px-3 py-1 text-xs font-mono border-r border-white/10 ${!expandedYear?'bg-white text-black font-bold':'text-white/60 hover:text-white'}`}>ANN</button>
                <button onClick={setViewQuarterly} className={`px-3 py-1 text-xs font-mono border-r border-white/10 ${(expandedYear&&!expandedQuarters[0])?'bg-white text-black font-bold':'text-white/60 hover:text-white'}`}>QTR</button>
                <button onClick={setViewMonthly} className={`px-3 py-1 text-xs font-mono ${(expandedYear&&expandedQuarters[0])?'bg-white text-black font-bold':'text-white/60 hover:text-white'}`}>MTH</button>
              </div>
              <div className="flex items-center bg-white/5 rounded px-2 border border-white/10">
                <button onClick={()=>setPlanningYear(y=>y-1)} className="p-1.5 text-white hover:text-emerald-400">&lt;</button>
                <span className="font-mono font-bold mx-2 text-white text-sm">{planningYear}</span>
                <button onClick={()=>setPlanningYear(y=>y+1)} className="p-1.5 text-white hover:text-emerald-400">&gt;</button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="file" ref={fileInputRef} style={{display:'none'}} onChange={handleImportFile} accept=".csv"/>
              <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white"><FileSpreadsheet size={13}/><span className="hidden sm:inline">TEMPLATE</span></button>
              <button onClick={()=>fileInputRef.current.click()} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white"><Upload size={13}/><span className="hidden sm:inline">IMPORT</span></button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white"><Download size={13}/><span className="hidden sm:inline">EXPORT</span></button>
              <div className="w-px h-5 bg-white/10"/>
              <button onClick={onClose} className="px-3 sm:px-4 py-1.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-200">CLOSE</button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-grow overflow-auto p-4 sm:p-6 custom-scrollbar bg-black/20">

            {/* VOLUME TABLE */}
            <div className="mb-12">
              <h3 className="font-mono text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2"><Activity size={16}/> VOLUME PLAN (LOCAL CURRENCY)</h3>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead className="sticky top-0 bg-[#18181b] z-20">
                    <tr className="border-b border-white/20">
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52 text-white">CURRENCY</th>
                      <th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 text-white">
                        <div className="flex items-center justify-center gap-1.5">{planningYear} TOTAL <button onClick={()=>setExpandedYear(!expandedYear)} className="hover:text-emerald-400">{expandedYear?<MinusSquare size={13}/>:<PlusSquare size={13}/>}</button></div>
                      </th>
                      {expandedYear && quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          <th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 min-w-[88px] text-white">
                            <div className="flex items-center justify-center gap-1">{q}<button onClick={()=>{const nq=[...expandedQuarters];nq[qi]=!nq[qi];setExpandedQuarters(nq);}} className="hover:text-emerald-400">{expandedQuarters[qi]?<MinusSquare size={11}/>:<PlusSquare size={11}/>}</button></div>
                          </th>
                          {expandedQuarters[qi]&&[0,1,2].map(o=><th key={o} className="p-2 font-mono text-xs text-center border-l border-white/10 min-w-[68px] opacity-70 text-white">{months[qi*3+o].toUpperCase()}</th>)}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>(
                      <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-2 sm:p-3 font-bold font-mono text-white border-r border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button onClick={()=>handleDeleteClick(curr.id)} disabled={curr.code==='USD'} className={`p-0.5 rounded ${isConfirmingDelete===curr.id?'bg-red-500 text-white':'text-white/20 hover:text-red-500 disabled:opacity-0'}`}><Trash2 size={11}/></button>
                              <FlagIcon code={curr.code}/><span className="text-sm">{curr.code}</span>
                            </div>
                            <span className="text-xs opacity-30">VOL</span>
                          </div>
                        </td>
                        <td className="p-2 border-l border-white/10 bg-white/5"><FormattedInput value={Math.round(getTotalVolume(curr.monthlyVolumes))} onChange={v=>handleVolumeYearUpdate(curr.id,v)} className="w-full bg-transparent text-center font-bold outline-none text-emerald-400 text-sm"/></td>
                        {expandedYear&&quarters.map((q,qi)=>(
                          <React.Fragment key={q}>
                            <td className="p-2 border-l border-white/10 bg-white/5"><FormattedInput value={Math.round(getQuarterVolume(curr.monthlyVolumes,qi))} onChange={v=>handleVolumeQuarterUpdate(curr.id,qi,v)} className="w-full bg-transparent text-center font-mono text-xs outline-none text-emerald-300/80"/></td>
                            {expandedQuarters[qi]&&[0,1,2].map(o=><td key={o} className="p-2 border-l border-white/10"><FormattedInput value={Math.round(curr.monthlyVolumes[qi*3+o])} onChange={v=>handleVolumeMonthUpdate(curr.id,qi*3+o,v)} className="w-full bg-transparent text-center font-mono text-xs text-white/50 outline-none"/></td>)}
                          </React.Fragment>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="p-3 border-r border-white/10">
                        <div className="flex items-center gap-2 pl-6">
                          <div className="relative">
                            <input placeholder="ADD..." value={currencySearch} onChange={e=>{setCurrencySearch(e.target.value.toUpperCase());setShowCurrencyDropdown(true);}} onFocus={()=>setShowCurrencyDropdown(true)} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();handleAdd(null);}}} className="w-20 bg-white/10 p-1.5 rounded text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-400 text-white placeholder-white/30" maxLength={3}/>
                            {showCurrencyDropdown&&currencySearch.length>0&&(
                              <div className="absolute top-full left-0 mt-1 w-32 bg-[#18181b] border border-white/20 rounded shadow-xl max-h-40 overflow-y-auto z-50 custom-scrollbar">
                                {filteredCurrencies.map(c=><button key={c} onClick={()=>handleAdd(c)} className="w-full text-left px-3 py-2 text-xs font-mono text-white hover:bg-emerald-500/20 hover:text-emerald-400">{c}</button>)}
                              </div>
                            )}
                          </div>
                          <button onClick={()=>handleAdd(null)} className="p-1 hover:text-emerald-400"><Plus size={15} className="text-white/30"/></button>
                        </div>
                      </td><td colSpan={100}/>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* BUDGET RATE TABLE */}
            <div>
              <h3 className="font-mono text-sm font-bold text-blue-400 mb-4 flex items-center gap-2 border-t border-white/10 pt-8"><DollarSign size={16}/> BUDGET RATE PLAN</h3>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52 text-white">CURRENCY / DIR</th>
                      <th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 text-white">{planningYear} AVG</th>
                      {expandedYear&&quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          <th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 bg-white/5 min-w-[88px] text-white">{q} AVG</th>
                          {expandedQuarters[qi]&&[0,1,2].map(o=><th key={o} className="p-2 font-mono text-xs text-center border-l border-white/10 min-w-[68px] opacity-70 text-white">{months[qi*3+o].toUpperCase()}</th>)}
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>{
                      if(curr.code==='USD') return null;
                      return(
                        <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2 sm:p-3 font-bold font-mono border-r border-white/10 text-white pl-8">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><FlagIcon code={curr.code}/> <span>{curr.code}</span><button onClick={()=>handleToggleDirection(curr.id)} className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white"><ArrowLeftRight size={11}/></button></div>
                              <span className={`text-[9px] font-mono font-bold px-1 rounded transition-all duration-500 ${flashStates[curr.id]?'bg-emerald-400 text-black':'opacity-30 text-white'}`}>{curr.rateDirection==='LOCAL_PER_USD'?`(${curr.code}/USD)`:`(USD/${curr.code})`}</span>
                            </div>
                          </td>
                          <td className="p-2 border-l border-white/10 bg-white/5"><DecimalInput value={curr.annualBudgetRate} onChange={v=>handleRateYearUpdate(curr.id,v)} className="w-full bg-transparent text-center font-bold outline-none text-blue-400"/></td>
                          {expandedYear&&quarters.map((q,qi)=>(
                            <React.Fragment key={q}>
                              <td className="p-2 border-l border-white/10 bg-white/5"><DecimalInput value={getQuarterRate(curr.monthlyRates,qi)} onChange={v=>handleRateQuarterUpdate(curr.id,qi,v)} className="w-full bg-transparent text-center font-mono text-sm outline-none text-blue-300/80"/></td>
                              {expandedQuarters[qi]&&[0,1,2].map(o=>{const mi=qi*3+o;return<td key={mi} className="p-2 border-l border-white/10"><DecimalInput value={curr.monthlyRates[mi]} onChange={v=>handleRateMonthUpdate(curr.id,mi,v)} className="w-full bg-transparent text-center font-mono text-xs text-white/50 outline-none"/></td>;})}
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
              <div className="flex flex-wrap gap-3 justify-between items-center mb-4 border-t border-white/10 pt-8">
                <h3 className="font-mono text-sm font-bold text-amber-500 flex items-center gap-2"><DollarSign size={16}/> ACTUAL / FORECAST RATES</h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={()=>setShowFillConfirm(true)} className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white"><Zap size={12}/> FILL FORECAST</button>
                  <div className="flex items-center gap-2">
                    {lastFetchedLabel && <span className="text-[9px] font-mono text-white/30 hidden sm:inline">{lastFetchedLabel}</span>}
                    <button onClick={handleFetchMarketData} disabled={isFetchingRates} className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white disabled:opacity-50">
                      <RefreshCw size={12} className={isFetchingRates?'animate-spin':''}/> FETCH MARKET DATA
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="p-2 sm:p-3 font-mono text-xs opacity-70 w-36 sm:w-52 text-white">CURRENCY / SOURCE</th>
                      {expandedYear?quarters.map((q,qi)=>(
                        <React.Fragment key={q}>
                          {expandedQuarters[qi]?[0,1,2].map(o=><th key={o} className="p-2 font-mono text-xs text-center border-l border-white/10 min-w-[68px] opacity-70 text-white">{months[qi*3+o].toUpperCase()}</th>):<th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 min-w-[88px] text-white">{q} (AVG)</th>}
                        </React.Fragment>
                      )):<th className="p-2 sm:p-3 font-mono text-xs text-center border-l border-white/10 text-white">YEAR AVG</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map(curr=>{
                      if(curr.code==='USD') return null;
                      return(
                        <tr key={curr.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-2 sm:p-3 font-bold font-mono border-r border-white/10 text-white pl-8">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1"><div className="flex items-center gap-1.5"><FlagIcon code={curr.code}/>{curr.code}</div><MiniSourceChip source={curr.rateSource}/></div>
                              <span className="text-[9px] font-mono opacity-30 text-white">{curr.rateDirection==='LOCAL_PER_USD'?`(${curr.code}/USD)`:`(USD/${curr.code})`}</span>
                            </div>
                          </td>
                          {expandedYear?quarters.map((q,qi)=>(
                            <React.Fragment key={q}>
                              {expandedQuarters[qi]?[0,1,2].map(o=>{
                                const mi=qi*3+o,isActual=mi<=currentYTDMonth,src=curr.monthlyRateSources?curr.monthlyRateSources[mi]:'Manual';
                                return(
                                  <td key={mi} className="p-2 border-l border-white/10 bg-white/5">
                                    <div className="relative">
                                      <DecimalInput value={curr.monthlyActualRates[mi]} onChange={v=>handleActualMonthUpdate(curr.id,mi,v)} className={`w-full bg-transparent text-center font-mono text-sm outline-none ${isActual?'text-white font-bold':'text-white/40 italic'}`}/>
                                      {isActual&&<div className="absolute top-0 right-0 w-1 h-1 bg-emerald-500 rounded-full"/>}
                                      <div className="absolute -bottom-1.5 right-0 opacity-80 scale-75 origin-bottom-right pointer-events-none"><MiniSourceChip source={src}/></div>
                                    </div>
                                  </td>
                                );
                              }):<td className="p-2 border-l border-white/10"><div className="text-center font-mono text-sm opacity-50">{(curr.monthlyActualRates.slice(qi*3,qi*3+3).reduce((a,b)=>a+b,0)/3).toFixed(4)}</div></td>}
                            </React.Fragment>
                          )):<td className="p-2 border-l border-white/10"><div className="text-center font-mono text-sm opacity-50">{(curr.monthlyActualRates.reduce((a,b)=>a+b,0)/12).toFixed(4)}</div></td>}
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
    setPortfolio(prev => [...prev, { id:newId, code, budgetType:'annual', annualBudgetRate:1.0, quarterlyRates:Array(4).fill(1.0), monthlyRates:Array(12).fill(1.0), actualRate:1.05, monthlyActualRates:Array(12).fill(1.05), monthlyVolumes:Array(12).fill(0), isCollapsed:true, rateDirection:'USD_PER_LOCAL', rateSource:'UI-Manual', monthlyRateSources:Array(12).fill('UI-Manual') }]);
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
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], monthlyVolumes:item.volumes, monthlyRates:newRates, annualBudgetRate:avgRate, quarterlyRates:qRates, monthlyActualRates:newActuals, rateSource:'CSV', monthlyRateSources:Array(12).fill('CSV') };
        } else {
          const newId = Math.max(...updated.map(c=>c.id),0)+1;
          updated.push({ id:newId, code:item.code, budgetType:'monthly', annualBudgetRate:avgRate, quarterlyRates:qRates, monthlyRates:newRates, actualRate:avgRate, monthlyActualRates:newActuals, monthlyVolumes:item.volumes, isCollapsed:true, rateDirection:direction, rateSource:'CSV', monthlyRateSources:Array(12).fill('CSV') });
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

  const handleImportFileMain = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').map(l=>l.trim()).filter(l=>l);
      const importedData = [];
      for (let i=1;i<lines.length;i++) {
        const cols=lines[i].split(','); if(cols.length<25) continue;
        const code=cols[0].toUpperCase(); if(!ISO_CURRENCIES.includes(code)) continue;
        importedData.push({code,volumes:cols.slice(1,13).map(Number),ratesRaw:cols.slice(13,25).map(Number),actualsRaw:cols.length>25?cols.slice(25,37).map(Number):cols.slice(13,25).map(Number)});
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
    let annualBudget=0,ytdBudget=0,ytdActual=0,annualForecast=0,mtdBudget=0,mtdActual=0;
    port.forEach(curr => {
      curr.monthlyVolumes.forEach((vol,i) => {
        const bRate=curr.monthlyRates[i]||1, aRate=curr.monthlyActualRates[i]||1;
        const mBudget=curr.rateDirection==='USD_PER_LOCAL'?vol*bRate:vol/bRate;
        const mActual=curr.rateDirection==='USD_PER_LOCAL'?vol*aRate:vol/aRate;
        annualBudget+=mBudget;
        if(i<=currentYTDMonth){ytdBudget+=mBudget;ytdActual+=mActual;}
        if(i===currentYTDMonth){mtdBudget+=mBudget;mtdActual+=mActual;}
        if(i<=currentYTDMonth){annualForecast+=mActual;}
        else{const fRate=curr.monthlyActualRates[i]||bRate;annualForecast+=curr.rateDirection==='USD_PER_LOCAL'?vol*fRate:vol/fRate;}
      });
    });
    return{annualBudget,ytdBudget,ytdActual,ytdVariance:ytdBudget-ytdActual,mtdVariance:mtdBudget-mtdActual,annualForecast};
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
      const overColor=isLocalPerUsd?'#10b981':'#ef4444';
      const underColor=isLocalPerUsd?'#ef4444':'#10b981';
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
  const handlePdfExport = async () => {
    const id=notify.loading('Generating PDF...');
    try{const{exportToPdf}=await import('./utils/exportHelpers');await exportToPdf();notify.dismiss(id);notify.success('PDF downloaded');}
    catch(err){notify.dismiss(id);notify.error(`PDF failed: ${err.message}`);}
  };

  // ── Theme ──
  const theme = darkMode ? {
    bg:'bg-black',text:'text-slate-100',card:'bg-zinc-900/50 border-zinc-800',accent:'text-emerald-400',danger:'text-rose-500',chartGrid:'#27272a',
  }:{
    bg:'bg-gray-50',text:'text-gray-900',card:'bg-white border-gray-200 shadow-sm',accent:'text-blue-600',danger:'text-red-600',chartGrid:'#e2e8f0',
  };

  const scrollbarStyles=`
    .custom-scrollbar::-webkit-scrollbar{width:6px;}
    .custom-scrollbar::-webkit-scrollbar-track{background:transparent;}
    .custom-scrollbar::-webkit-scrollbar-thumb{background-color:${darkMode?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'};border-radius:20px;}
    input[type=range]{touch-action:none;}
    input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
  `;

  if (view === 'intro') return <ParticleIntro onStart={() => setView('dashboard')} />;

  return (
    <div id="dashboard-root" className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500 font-sans`}>
      <style>{scrollbarStyles}</style>
      <style>{shineStyles}</style>

      <PlanningModal isOpen={isVolumeModalOpen} onClose={()=>setIsVolumeModalOpen(false)} portfolio={portfolio} onUpdatePortfolio={updateCurrency} onAddCurrency={addCurrency} onRemoveCurrency={removeCurrency} onBulkImport={handleBulkImport} onFillForecast={handleFillForecastFromBudget} theme={theme} darkMode={darkMode} currentYTDMonth={currentYTDMonth} scrollToRates={shouldScrollToRates} fetchRates={fetchRates} isFetchingRates={isFetchingRates} lastFetched={lastFetched}/>

      {/* Mobile top bar */}
      <div className={`sticky top-0 z-20 flex lg:hidden items-center justify-between px-4 py-3 border-b ${darkMode?'bg-black/90 border-white/10':'bg-white/90 border-black/10'} backdrop-blur`}>
        <h1 className="font-mono text-xs font-bold tracking-widest opacity-60">FX DASHBOARD</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleExcelExport} className="p-2 rounded hover:bg-white/10 opacity-60 hover:opacity-100" title="Excel"><FileSpreadsheet size={16}/></button>
          <button onClick={handlePdfExport} className="p-2 rounded hover:bg-white/10 opacity-60 hover:opacity-100" title="PDF"><Download size={16}/></button>
          <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded hover:bg-white/10">{darkMode?<Sun size={16}/>:<Moon size={16}/>}</button>
          <button onClick={()=>setIsLeftPanelOpen(!isLeftPanelOpen)} className="p-2 rounded hover:bg-white/10"><Menu size={18}/></button>
        </div>
      </div>

      <div className="pt-4 pb-12 px-3 sm:px-4 max-w-[1920px] mx-auto">

        {/* HERO */}
        <div className="mb-8 sm:mb-12 grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 lg:col-span-8">
            <h1 className="text-[clamp(2rem,6vw,5rem)] leading-[0.85] font-black tracking-tighter uppercase mb-2">
              <span className="block text-[clamp(1rem,3.5vw,2.5rem)] opacity-70 mb-2">{getMonthName(currentYTDMonth)} YTD FX IMPACT</span>
              Variance
              <span className={`block ${kpiData.ytdVariance<0?theme.danger:theme.accent}`}>
                {formatFinancial(kpiData.ytdVariance, displayUnit)}
                {scenarioActive&&<span className="ml-3 text-[0.35em] align-middle bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded font-mono">SIM</span>}
              </span>
            </h1>
            <p className="font-mono text-xs opacity-60 tracking-widest mt-2">/// TOTAL PORTFOLIO P&L IMPACT (USD)</p>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className={`p-4 border-l-4 ${kpiData.ytdVariance<0?'border-rose-500 bg-rose-500/5':'border-emerald-400 bg-emerald-400/5'}`}>
              <div className="font-mono text-[10px] uppercase mb-1 opacity-70">Portfolio Health</div>
              <div className="text-xl font-bold">{kpiData.ytdVariance<0?<span className="text-rose-500">OVER BUDGET</span>:<span className="text-emerald-400">UNDER BUDGET</span>}</div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-12 gap-3 sm:gap-6">

          {/* LEFT SIDEBAR */}
          {isLeftPanelOpen&&(
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={()=>setIsLeftPanelOpen(false)} className={`w-12 h-10 flex items-center justify-center rounded-lg border cursor-pointer transition-colors ${darkMode?'border-white/20 bg-white/5 hover:bg-white/10':'border-black/10 bg-black/5'} ${highlightClose?'btn-shine btn-pulse-ring':''}`} title="Close"><PanelLeftClose size={17} className="opacity-70"/></button>
                  <button onClick={()=>setDarkMode(!darkMode)} className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${darkMode?'border-white/20 hover:bg-white/10 bg-white/5':'border-black/10 hover:bg-black/5 bg-gray-100'}`}>{darkMode?<Sun size={15}/>:<Moon size={15}/>}</button>
                  <div className="flex-grow">
                    <input type="file" ref={fileInputRefMain} style={{display:'none'}} onChange={handleImportFileMain} accept=".csv"/>
                    <button onClick={()=>fileInputRefMain.current.click()} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono border border-white/20 text-white"><Upload size={13}/> IMPORT</button>
                  </div>
                </div>
                <button onClick={()=>setIsVolumeModalOpen(true)} className={`w-full py-2.5 rounded-lg border ${darkMode?'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400':'border-blue-500/50 bg-blue-50 text-blue-600'} font-bold font-mono tracking-widest text-[10px] flex items-center justify-center gap-2`}>
                  <LayoutDashboard size={13}/> PLAN VOLUMES & RATES
                </button>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border ${darkMode?'bg-white/5 border-white/10':'bg-black/5 border-black/10'}`}>
                  {[1,1000,1000000].map(u=>(
                    <button key={u} onClick={()=>setDisplayUnit(u)} className={`py-1 rounded font-black text-sm tracking-tight transition-colors ${displayUnit===u?(darkMode?'bg-white text-black':'bg-black text-white'):'opacity-50 hover:opacity-100'}`}>
                      {u===1?'$':u===1000?'$k':'$M'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExcelExport} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-mono border bg-white/5 hover:bg-white/10 border-white/20 text-white"><FileSpreadsheet size={12}/> XLSX</button>
                  <button onClick={handlePdfExport} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-mono border bg-white/5 hover:bg-white/10 border-white/20 text-white"><Download size={12}/> PDF</button>
                </div>
                <h3 className="font-mono text-xs font-bold tracking-widest opacity-50 px-1 mt-1">EX RATE PLAN</h3>
              </div>
              <div className="space-y-3">
                {portfolio.map(currency=>(
                  <CurrencyRateCard key={currency.id} data={currency} onChange={updateCurrency} onRemove={removeCurrency} onToggleDirection={handleCardToggleDirection} flashState={flashStates[currency.id]} theme={theme} darkMode={darkMode}/>
                ))}
              </div>
              <ScenarioPanel portfolio={portfolio} deltas={scenarioDeltas} onDeltaChange={(code,val)=>setScenarioDeltas(prev=>({...prev,[code]:val}))} active={scenarioActive} onToggle={()=>setScenarioActive(!scenarioActive)} baseKpi={baseKpiData||kpiData} simKpi={kpiData} displayUnit={displayUnit} darkMode={darkMode}/>
            </div>
          )}

          {/* MIDDLE COLUMN */}
          <div className={`col-span-12 ${isLeftPanelOpen?'lg:col-span-5':'lg:col-span-8'} space-y-5 transition-all duration-500`}>

            {!isLeftPanelOpen&&(
              <div className="hidden lg:flex justify-between items-center">
                <button onClick={()=>setIsLeftPanelOpen(true)} className={`flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 px-3 py-2 rounded-lg border border-emerald-500/30 ${highlightMenu?'btn-shine btn-pulse-ring':''}`}>
                  <PanelLeftOpen size={15}/> SHOW MENU
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleExcelExport} className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border opacity-60 hover:opacity-100 ${darkMode?'bg-white/5 border-white/10 text-white':'bg-black/5 border-black/10 text-black'}`}><FileSpreadsheet size={13}/> XLSX</button>
                  <button onClick={handlePdfExport} className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border opacity-60 hover:opacity-100 ${darkMode?'bg-white/5 border-white/10 text-white':'bg-black/5 border-black/10 text-black'}`}><Download size={13}/> PDF</button>
                  <button onClick={()=>setIsVolumeModalOpen(true)} className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg border opacity-60 hover:opacity-100 ${darkMode?'bg-white/5 border-white/10 text-white':'bg-black/5 border-black/10 text-black'}`}><LayoutDashboard size={13}/> PLANNER</button>
                </div>
              </div>
            )}

            {/* KPI GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                {label:'Annual Budget',value:kpiData.annualBudget,highlight:false},
                {label:'YTD Budget',value:kpiData.ytdBudget,highlight:false},
                {label:'YTD Actual',value:kpiData.ytdActual,highlight:false},
                {label:'Annual Forecast',value:kpiData.annualForecast,highlight:false},
                {label:'YTD Variance',value:kpiData.ytdVariance,highlight:true},
                {label:'MTD Variance',value:kpiData.mtdVariance,highlight:true},
              ].map(({label,value,highlight})=>(
                <div key={label} className={`p-3 rounded-xl border flex flex-col justify-center ${highlight?(darkMode?'border-emerald-500/30 bg-emerald-900/10':'border-emerald-500/30 bg-emerald-50'):theme.card}`}>
                  <div className={`font-mono text-xs mb-1 uppercase ${highlight?(darkMode?'text-emerald-400 font-bold':'text-emerald-600 font-bold'):'opacity-50'}`}>{label}</div>
                  <div className={`text-xl sm:text-3xl font-black tracking-tight ${highlight?(value>=0?(darkMode?theme.accent:'text-emerald-600'):theme.danger):''}`}>
                    {formatFinancial(value,displayUnit)}
                  </div>
                </div>
              ))}
            </div>

            {/* YTD PERIOD — tick-timeline selector */}
            <div className={`p-3 sm:p-4 rounded-xl border ${theme.card}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-[10px] font-bold opacity-50 tracking-widest">YTD PERIOD</span>
                <span className={`font-mono text-xs font-bold ${theme.accent}`}>{getMonthName(currentYTDMonth).toUpperCase()}</span>
              </div>
              <div className="flex gap-px">
                {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m,i)=>(
                  <button key={i} onClick={()=>setCurrentYTDMonth(i)} className="flex-1 flex flex-col items-center gap-1 py-1 rounded group" title={['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}>
                    {/* tick mark — taller + glowing on active month */}
                    <div className={`w-0.5 rounded-full transition-all duration-150 ${
                      i===currentYTDMonth
                        ? `h-4 ${darkMode?'bg-emerald-400 shadow-[0_0_5px_2px_rgba(52,211,153,0.5)]':'bg-blue-500 shadow-[0_0_5px_2px_rgba(59,130,246,0.5)]'}`
                        : i<currentYTDMonth
                        ? `h-2.5 ${darkMode?'bg-emerald-500/50':'bg-blue-400/40'}`
                        : `h-2 ${darkMode?'bg-white/15 group-hover:bg-white/35':'bg-black/10 group-hover:bg-black/25'}`
                    }`}/>
                    {/* month letter */}
                    <span className={`text-[8px] font-mono font-bold leading-none transition-colors select-none ${
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
                  {['ANNUAL','YTD'].map(m=><button key={m} onClick={()=>setViewMode(m)} className={`px-2 py-0.5 text-[9px] border rounded ${viewMode===m?'bg-white text-black border-white':'border-white/20'}`}>{m}</button>)}
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expenseChartData} margin={{left:8,right:55,top:0,bottom:15}} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.chartGrid} opacity={0.2}/>
                  <XAxis type="number" tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>formatFinancial(v,displayUnit)}/>
                  <YAxis type="category" dataKey="code" tick={({x,y,payload})=>(<g transform={`translate(${x},${y})`}><text x={-24} y={3} textAnchor="end" fill="#64748b" fontSize={10} fontWeight="bold">{payload.value}</text>{CURRENCY_TO_COUNTRY[payload.value]&&<image x={-19} y={-8} width="13" height="9" href={`https://flagcdn.com/w40/${CURRENCY_TO_COUNTRY[payload.value]}.png`}/>}</g>)} width={52} axisLine={false} tickLine={false}/>
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
                  <BarChart data={impactChartData} barSize={28} margin={{top:8,right:8,left:8,bottom:18}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                    <XAxis dataKey="code" tick={({x,y,payload})=>(<g transform={`translate(${x},${y})`}><foreignObject x={-9} y={0} width={18} height={12}><div className="flex justify-center"><FlagIcon code={payload.value} className="w-4 h-3 rounded-[1px]"/></div></foreignObject><text x={0} y={22} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold">{payload.value}</text></g>)} height={35} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
                    <Tooltip content={<CustomImpactTooltip displayUnit={displayUnit}/>} cursor={{fill:'transparent'}}/>
                    <Legend iconType="circle" wrapperStyle={{fontSize:'11px'}}/>
                    <Bar dataKey="share" name="% of Spend" fill="#3b82f6" radius={[4,4,0,0]}/>
                    <Bar dataKey="impact" name="% of Variance" fill="#f59e0b" radius={[4,4,0,0]}/>
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
                    <button onClick={()=>setIsAccumulatedForecast(!isAccumulatedForecast)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isAccumulatedForecast?'bg-emerald-500':'bg-gray-700'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${isAccumulatedForecast?'translate-x-4':'translate-x-0'}`}/>
                    </button>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={accVarianceData} stackOffset="sign" margin={{top:20,right:0,left:0,bottom:22}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                  <XAxis dataKey="name" tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>formatFinancial(v,displayUnit)}/>
                  <Tooltip cursor={{fill:'transparent'}} contentStyle={{backgroundColor:darkMode?'#000':'#fff',borderColor:darkMode?'#52525b':'#e5e7eb',color:darkMode?'#fff':'#000',fontSize:'12px',borderRadius:'0.5rem'}} formatter={v=>formatFinancial(v,displayUnit)}/>
                  <ReferenceLine y={0} stroke="#666"/>
                  {activePortfolio.filter(c=>c.code!=='USD').map((curr,idx)=>{
                    if(accVisibleCurrencies.length>0&&!accVisibleCurrencies.includes(curr.code))return null;
                    return(
                      <Bar key={curr.code} dataKey={curr.code} stackId="stack" fill={getCurrencyColor(curr.code,idx)} barSize={26}>
                        <LabelList dataKey={curr.code} position="inside" formatter={v=>Math.abs(v)>0?formatFinancial(v,displayUnit):''} style={{fill:'white',fontWeight:'bold',fontFamily:'monospace',fontSize:'9px',pointerEvents:'none'}}/>
                      </Bar>
                    );
                  })}
                  <Line type="monotone" dataKey="total" stroke="none" isAnimationActive={false}>
                    <LabelList dataKey="total" position="top" content={props=><CustomTotalLabel {...props} displayUnit={displayUnit} darkMode={darkMode}/>}/>
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <div className={`flex justify-between items-center sticky top-0 lg:top-2 z-10 py-2 ${darkMode?'bg-black':'bg-gray-50'}`}>
              <h3 className="font-mono text-xs font-bold tracking-widest flex items-center gap-2 opacity-70"><Calendar size={13}/> RATE PERFORMANCE</h3>
              <button onClick={()=>{setIsVolumeModalOpen(true);setShouldScrollToRates(true);}} className={`flex items-center gap-1 text-[9px] font-mono border px-2 py-1 rounded ${darkMode?'border-white/20 hover:bg-white/10':'border-black/20 hover:bg-black/5'}`}>
                <Table size={10}/> EDIT RATES
              </button>
            </div>

            {portfolio.filter(c=>c.code!=='USD').length===0&&(
              <EmptyState icon={<Calendar size={28}/>} message="Add currencies in the Planner to see rate trends."/>
            )}

            {portfolio.filter(c=>c.code!=='USD').map(curr=>{
              const chartData=allChartsData.currencies[curr.id];
              if(!chartData)return null;
              const{data,dataMin,dataMax,overColor,underColor}=chartData;
              const curIdx=currentYTDMonth-1;
              return(
                <div key={curr.id} className={`p-4 rounded-xl border ${theme.card} hover:border-blue-500/50 transition-colors`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2"><FlagIcon code={curr.code}/><h4 className="text-xs font-bold font-mono text-white/90">{curr.code} RATE TREND</h4></div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] opacity-30 font-mono">2026</span>
                      <div className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-mono border border-blue-500/20">{curr.rateDirection==='LOCAL_PER_USD'?`1 USD = ${curr.code}`:`1 ${curr.code} = USD`}</div>
                      <button onClick={()=>handleCardToggleDirection(curr.id)} className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white" title="Swap"><ArrowLeftRight size={11}/></button>
                    </div>
                  </div>
                  <div className="h-[140px] sm:h-[170px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{top:24,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.chartGrid} opacity={0.2}/>
                        <XAxis dataKey="month" tick={{fontSize:8,fill:'#64748b'}} axisLine={false} tickLine={false} interval={0}/>
                        <YAxis domain={[dataMin*0.9,dataMax*1.1]} tick={{fontSize:8,fill:'#64748b'}} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(2)} width={34}/>
                        <Tooltip content={<CustomRateTooltip darkMode={darkMode}/>} cursor={{stroke:theme.chartGrid,strokeWidth:1}}/>
                        {/* Coloured fills between the two lines, per-segment */}
                        <Area type="monotone" dataKey="overRange" stroke="none" fill={overColor} fillOpacity={0.3} legendType="none" isAnimationActive={false}/>
                        <Area type="monotone" dataKey="underRange" stroke="none" fill={underColor} fillOpacity={0.3} legendType="none" isAnimationActive={false}/>
                        {/* Budget line – dashed amber; label only on current month */}
                        <Area type="monotone" dataKey="budget" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Budget Rate">
                          <LabelList dataKey="budget" content={({x,y,value,index})=>{
                            if(index!==curIdx||typeof value!=='number')return null;
                            return <text key="bl" x={x} y={y+14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#fbbf24" fontWeight="bold">{value.toFixed(4)}</text>;
                          }}/>
                        </Area>
                        {/* Actual line – solid white; label only on current month */}
                        <Area type="monotone" dataKey="actual" stroke="#fff" strokeWidth={2} fill="none" name="Actual Rate">
                          <LabelList dataKey="actual" content={({x,y,value,index})=>{
                            if(index!==curIdx||typeof value!=='number')return null;
                            return <text key="al" x={x} y={y-8} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#fff" fontWeight="bold">{value.toFixed(4)}</text>;
                          }}/>
                        </Area>
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
