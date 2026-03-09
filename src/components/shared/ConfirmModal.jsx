export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = true }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="font-mono font-bold text-white text-sm mb-2">{title}</h3>
        <p className="font-mono text-xs text-white/60 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono font-bold rounded border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-mono font-bold rounded transition-colors ${danger ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-black'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
