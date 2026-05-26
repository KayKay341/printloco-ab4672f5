import { createRoot, type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

const MAX_AUTO_RETRIES = import.meta.env.DEV ? 8 : 4;
const RETRY_DELAYS_MS = import.meta.env.DEV ? [250, 750, 1500, 3000, 5000, 8000, 12000, 15000] : [250, 750, 1500, 3000];

let root: Root | null = null;
let retryCount = 0;
let retryTimer: number | undefined;
let mountGeneration = 0;

const clearBootRecoveryAttempt = () => {
  try {
    sessionStorage.removeItem("printloco:boot-reload-attempted");
  } catch {
    // Startup recovery must not depend on storage being available after sleep/wake.
  }
};

const markRootHealthy = () => {
  const rootEl = ensureRoot();
  rootEl.dataset.printlocoMounted = "true";
  rootEl.dataset.printlocoLastHealthy = String(Date.now());
  clearBootRecoveryAttempt();
};

const RootHealth = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    markRootHealthy();
    const heartbeat = window.setInterval(markRootHealthy, 30000);
    return () => window.clearInterval(heartbeat);
  }, []);

  return children;
};

declare global {
  interface Window {
    __PRINTLOCO_RECOVER__?: (reason?: unknown) => void;
  }
}

const ensureRoot = () => {
  let el = document.getElementById("root");
  if (!el) {
    el = document.createElement("div");
    el.id = "root";
    document.body.prepend(el);
  }
  return el;
};

const renderFallback = (message: string, recovering = false) => {
  ensureRoot().innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;background:hsl(var(--background,0 0% 100%));color:hsl(var(--foreground,0 0% 7%))"><section style="max-width:420px;text-align:center;border:1px solid hsl(var(--border,0 0% 90%));border-radius:18px;padding:28px;background:hsl(var(--card,0 0% 100%));box-shadow:0 18px 50px rgba(0,0,0,.08)"><h1 style="font-size:22px;margin:0 0 8px">PrintLoco</h1><p style="margin:0 0 16px;color:hsl(var(--muted-foreground,0 0% 35%))">${message}</p>${recovering ? `<p style="margin:0;color:hsl(var(--muted-foreground,0 0% 35%));font-size:13px">Retry ${Math.min(retryCount, MAX_AUTO_RETRIES)} of ${MAX_AUTO_RETRIES}…</p>` : `<button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:12px;background:hsl(var(--primary,0 0% 7%));color:hsl(var(--primary-foreground,0 0% 100%));font-weight:700;cursor:pointer">Reload page</button>`}</section></main>`;
};

const storage = {
  get: (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Recovery must work even when browser storage is blocked or briefly locked.
    }
  },
  remove: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures during recovery cleanup.
    }
  },
};

const describeReason = (reason: unknown) => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object" && "message" in reason) return String((reason as { message?: unknown }).message);
  return "The app stopped responding.";
};

const isChunkLoadError = (reason: unknown) => {
  const message = describeReason(reason);
  return /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk/i.test(message);
};

const reloadOnceForBootFailure = () => {
  const reloadedKey = "printloco:boot-reload-attempted";
  if (!storage.get(reloadedKey)) {
    storage.set(reloadedKey, "true");
    window.location.reload();
    return true;
  }
  return false;
};

const mountApp = () => {
  window.clearTimeout(retryTimer);
  mountGeneration += 1;
  const generation = mountGeneration;
  const rootEl = ensureRoot();
  rootEl.dataset.printlocoMounted = "booting";

  try {
    root?.unmount();
  } catch {
    // If React is already wedged, discard the old tree and create a fresh root.
  }

  rootEl.innerHTML = "";

  try {
    root = createRoot(rootEl);
    root.render(
      <RootHealth>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </RootHealth>
    );
    window.setTimeout(() => {
      if (generation === mountGeneration) retryCount = 0;
    }, 6000);
  } catch (err) {
    scheduleRecover(err);
  }
};

const scheduleRecover = (reason?: unknown) => {
  window.clearTimeout(retryTimer);

  if (isChunkLoadError(reason)) {
    if (reloadOnceForBootFailure()) return;
  }

  if (retryCount >= MAX_AUTO_RETRIES) {
    renderFallback("The app tried to recover but still could not start. Please reload once.");
    return;
  }

  retryCount += 1;
  renderFallback("PrintLoco is recovering automatically.", true);
  const delay = RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)];
  retryTimer = window.setTimeout(mountApp, delay);
};

window.__PRINTLOCO_RECOVER__ = scheduleRecover;

window.setTimeout(() => {
  const rootEl = document.getElementById("root");
  if (!rootEl || rootEl.dataset.printlocoMounted !== "true" || !rootEl.textContent?.trim()) {
    if (reloadOnceForBootFailure()) return;
    scheduleRecover("Initial app boot did not finish");
  }
}, 12000);

window.addEventListener("printloco:recover", (event) => {
  scheduleRecover((event as CustomEvent).detail);
});

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  scheduleRecover((event as Event & { payload?: unknown }).payload ?? "Vite preload failed");
});

window.addEventListener(
  "error",
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.tagName === "SCRIPT" || target?.tagName === "LINK") {
      const failedUrl = target instanceof HTMLScriptElement ? target.src : target instanceof HTMLLinkElement ? target.href : "unknown resource";
      scheduleRecover(`Critical app resource failed to load: ${failedUrl}`);
      return;
    }
    if (event.error) scheduleRecover(event.error);
  },
  true,
);

window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) scheduleRecover(event.reason);
});

const recoverIfRootIsBlank = () => {
  window.setTimeout(() => {
    const rootEl = document.getElementById("root");
    const lastHealthy = Number(rootEl?.dataset.printlocoLastHealthy ?? 0);
    const staleWhileVisible = document.visibilityState === "visible" && lastHealthy > 0 && Date.now() - lastHealthy > 120000;
    const bootStalled = rootEl?.dataset.printlocoMounted === "booting" && (!lastHealthy || Date.now() - lastHealthy > 10000);
    if (!rootEl || rootEl.childElementCount === 0 || !rootEl.textContent?.trim()) {
      if (reloadOnceForBootFailure()) return;
      scheduleRecover("Blank root after page resume");
    } else if (bootStalled || rootEl.dataset.printlocoMounted !== "true" || staleWhileVisible) {
      if (staleWhileVisible || bootStalled) {
        if (reloadOnceForBootFailure()) return;
      }
      scheduleRecover("App heartbeat stopped after page resume");
    }
  }, 600);
};

mountApp();

// Recover from cached/blank bfcache pages after sleep/wake or reopening a tab.
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) scheduleRecover("Restored from browser cache");
  recoverIfRootIsBlank();
});
window.addEventListener("focus", recoverIfRootIsBlank);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") recoverIfRootIsBlank();
});
if (import.meta.env.DEV) {
  window.setInterval(recoverIfRootIsBlank, 5000);
}
