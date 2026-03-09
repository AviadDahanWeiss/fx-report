export const EmptyState = ({ icon, message, action }) => (
  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 py-8">
    {icon}
    <p className="font-mono text-xs text-center">{message}</p>
    {action}
  </div>
);
