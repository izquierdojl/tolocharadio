import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { useVersionCheck } from "../hooks/useVersionCheck.js";

const GITHUB_URL = "https://www.github.com/izquierdojl/tolocharadio";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  const { current, latest, hasUpdate, releaseUrl } = useVersionCheck();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fade-enter fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="about-modal-title" className="text-lg font-semibold text-foreground">
            Acerca de ToloChaRadio
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-muted">
            Reproductor de radio web personal con API interna.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Versión</span>
              <span className="font-medium text-foreground">v{current}</span>
            </div>

            {hasUpdate && latest && releaseUrl ? (
              <div className="flex items-center justify-between">
                <span className="text-muted">Actualización</span>
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand transition hover:text-foreground"
                >
                  v{latest}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <span className="text-muted">Repositorio</span>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground transition hover:text-brand"
              >
                GitHub
                <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted">Licencia</span>
              <span className="font-medium text-foreground">MIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
