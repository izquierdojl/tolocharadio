import { useEffect, useState } from "react";

const GITHUB_API = "https://api.github.com/repos/izquierdojl/tolocharadio/releases/latest";
const CACHE_KEY = "tolocha:version-check";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedResult {
  latest: string;
  releaseUrl: string;
  checkedAt: number;
}

interface VersionCheckResult {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  releaseUrl: string | null;
}

function parseSemver(v: string): [number, number, number] {
  const cleaned = v.replace(/^v/, "");
  const parts = cleaned.split(".").map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function isNewer(local: string, remote: string): boolean {
  const [lMaj, lMin, lPat] = parseSemver(local);
  const [rMaj, rMin, rPat] = parseSemver(remote);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

function readCache(): CachedResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedResult;
    if (Date.now() - data.checkedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(result: CachedResult): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // noop
  }
}

function getInitialResult(current: string): VersionCheckResult {
  const cached = readCache();
  if (cached) {
    return {
      current,
      latest: cached.latest,
      hasUpdate: isNewer(current, cached.latest),
      releaseUrl: cached.releaseUrl,
    };
  }
  return { current, latest: null, hasUpdate: false, releaseUrl: null };
}

export function useVersionCheck(): VersionCheckResult {
  const current = __APP_VERSION__;
  const [result, setResult] = useState<VersionCheckResult>(() => getInitialResult(current));

  useEffect(() => {
    if (result.latest !== null) return;

    let cancelled = false;

    fetch(GITHUB_API)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ tag_name: string; html_url: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        const latest = data.tag_name.replace(/^v/, "");
        const releaseUrl = data.html_url;
        writeCache({ latest, releaseUrl, checkedAt: Date.now() });
        setResult({
          current,
          latest,
          hasUpdate: isNewer(current, latest),
          releaseUrl,
        });
      })
      .catch(() => {
        // Silently fail — show only current version
      });

    return () => {
      cancelled = true;
    };
  }, [current, result.latest]);

  return result;
}
