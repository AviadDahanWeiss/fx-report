import { Calculator, RotateCcw } from 'lucide-react';
import { formatFinancial } from '../../utils/formatters';

export function ScenarioPanel({ portfolio, deltas, onDeltaChange, active, onToggle, baseKpi, simKpi, displayUnit, darkMode }) {
  const nonUsdCurrencies = portfolio.filter(c => c.code !== 'USD');

  const handleReset = () => {
    nonUsdCurrencies.forEach(c => onDeltaChange(c.code, 0));
  };

  return (
    <div className={`p-4 rounded-xl border transition-colors ${
      active
        ? darkMode ? 'border-purple-500/50 bg-purple-900/10' : 'border-purple-400/60 bg-purple-50'
        : darkMode ? 'border-purple-500/20 bg-purple-900/5' : 'border-purple-300/50 bg-purple-50/40'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-mono text-xs font-bold flex items-center gap-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          <Calculator size={14} /> WHAT-IF SCENARIO
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className={`text-[9px] font-mono flex items-center gap-1 transition-colors ${darkMode ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}>
            <RotateCcw size={10} /> RESET
          </button>
          <button
            onClick={onToggle}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors flex-shrink-0 ${active ? 'bg-purple-500' : darkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
            title={active ? 'Deactivate scenario' : 'Activate scenario'}
          >
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Per-currency sliders */}
      <div className="space-y-3">
        {nonUsdCurrencies.map(curr => {
          const delta = deltas[curr.code] ?? 0;
          const isPositive = delta > 0;
          const isNegative = delta < 0;
          const hint = curr.rateDirection === 'LOCAL_PER_USD'
            ? (isPositive ? '→ local weakens' : isNegative ? '→ local strengthens' : '')
            : (isPositive ? '→ rate up, cost up' : isNegative ? '→ rate down, saving' : '');

          return (
            <div key={curr.id}>
              <div className="flex justify-between items-center mb-1">
                <span className={`font-mono text-xs font-bold ${darkMode ? 'text-white/80' : 'text-gray-700'}`}>{curr.code}</span>
                <div className="flex items-center gap-1">
                  {hint && <span className={`text-[9px] font-mono ${darkMode ? 'opacity-40' : 'text-gray-400'}`}>{hint}</span>}
                  <span className={`font-mono text-xs font-bold w-12 text-right ${isPositive ? 'text-red-400' : isNegative ? 'text-emerald-500' : darkMode ? 'text-white/40' : 'text-gray-400'}`}>
                    {isPositive ? '+' : ''}{delta.toFixed(1)}%
                  </span>
                </div>
              </div>
              <input
                type="range" min="-20" max="20" step="0.5"
                value={delta}
                onChange={e => onDeltaChange(curr.code, Number(e.target.value))}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          );
        })}
      </div>

      {/* Impact summary — only when active */}
      {active && baseKpi && simKpi && (
        <div className="mt-4 pt-3 border-t border-purple-500/20 space-y-1.5">
          <div className={`flex justify-between text-[10px] font-mono ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
            <span>Base YTD Variance</span>
            <span className={baseKpi.ytdVariance >= 0 ? 'text-emerald-500' : 'text-red-400'}>
              {formatFinancial(baseKpi.ytdVariance, displayUnit)}
            </span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className={`font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>Simulated YTD Variance</span>
            <span className={`font-bold ${simKpi.ytdVariance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {formatFinancial(simKpi.ytdVariance, displayUnit)}
            </span>
          </div>
          <div className={`flex justify-between text-[10px] font-mono pt-1 border-t border-purple-500/10`}>
            <span className={darkMode ? 'text-white/40' : 'text-gray-400'}>Scenario Impact</span>
            <span className={`font-bold ${(simKpi.ytdVariance - baseKpi.ytdVariance) >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {simKpi.ytdVariance - baseKpi.ytdVariance >= 0 ? '+' : ''}
              {formatFinancial(simKpi.ytdVariance - baseKpi.ytdVariance, displayUnit)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
