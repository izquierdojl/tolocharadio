import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "../EmptyState.js";

interface SectionCardProps {
  title: string;
  description?: string;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}: SectionCardProps) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-faint">Cargando…</p>
      ) : isError ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title="No se pudieron cargar estos datos"
          description="Hubo un problema al recuperar tus estadísticas. Inténtalo de nuevo."
          action={
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400"
            >
              Reintentar
            </button>
          }
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<BarChart3 className="size-6" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        children
      )}
    </section>
  );
}
