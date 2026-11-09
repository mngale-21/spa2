export default function StatCard({ label, value, tone = "ink" }) {
  const tones = {
    ink: "text-ink-900",
    green: "text-status-active",
    amber: "text-status-suspended",
    red: "text-status-deleted",
  };
  const dots = {
    ink: "bg-brass-500",
    green: "bg-status-active",
    amber: "bg-status-suspended",
    red: "bg-status-deleted",
  };
  return (
    <div className="card">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />
        <p className="text-xs uppercase tracking-wide text-ink-700/50">{label}</p>
      </div>
      <p className={`font-display text-3xl mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  );
}
