import { useVersionCheck } from "../hooks/useVersionCheck.js";

const GITHUB_URL = "https://www.github.com/izquierdojl/tolocharadio";

export function Footer() {
  const { current, latest, hasUpdate, releaseUrl } = useVersionCheck();

  return (
    <footer className="flex items-center justify-center gap-2 pb-2 text-xs text-muted">
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
        <a
          href={releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand transition hover:text-foreground"
          title="Nueva version disponible"
        >
          -&gt; v{latest}
        </a>
      ) : null}
    </footer>
  );
}
