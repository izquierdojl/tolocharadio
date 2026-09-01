import { Info } from "lucide-react";
import { useVersionCheck } from "../hooks/useVersionCheck.js";

const GITHUB_URL = "https://www.github.com/izquierdojl/tolocharadio";

export function AboutSection() {
  const { current, latest, hasUpdate, releaseUrl } = useVersionCheck();

  return (
    <div className="rounded-lg px-3 py-2 text-sm text-muted">
      <div className="flex items-center gap-2">
        <Info className="size-4" />
        <span>Acerca de...</span>
      </div>
      <div className="mt-1 pl-6 text-xs">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-foreground"
          title="Repositorio en GitHub"
        >
          v{current}
        </a>
        {hasUpdate && latest && releaseUrl ? (
          <>
            {" "}
            <a
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand transition hover:text-foreground"
              title="Nueva version disponible"
            >
              -&gt; v{latest}
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
