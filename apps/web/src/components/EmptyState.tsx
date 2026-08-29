import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-pine-700 bg-pine-900/40 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-pine-800 text-pine-300">
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-pine-100">{title}</h2>
      <p className="max-w-sm text-sm text-pine-400">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}