import { Check, FileText, User, Database, Calculator } from 'lucide-react';

export const MiniSourceChip = ({ source }) => {
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
