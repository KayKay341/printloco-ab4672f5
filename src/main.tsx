import { createRoot, type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const MAX_AUTO_RETRIES = 4;
const RETRY_DELAYS_MS = [250, 750, 1500, 3000];

let root: Root | null = null;
let retryCount = 0;
let retryTimer: number | undefined;
let mountGeneration = 0;

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

const mountApp = () => {
  window.clearTimeout(retryTimer);
  mountGeneration += 1;
  const generation = mountGeneration;
  const rootEl = ensureRoot();
  rootEl.innerHTML = "";

  try {
    root?.unmount();
  } catch {
    // If React is already wedged, discard the old tree and create a fresh root.
  }

  try {
    root = createRoot(rootEl);
    root.render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
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
    const reloadedKey = "printloco:chunk-reload-attempted";
    if (!sessionStorage.getItem(reloadedKey)) {
      sessionStorage.setItem(reloadedKey, "true");
      window.location.reload();
      return;
    }
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

window.addEventListener("printloco:recover", (event) => {
  scheduleRecover((event as CustomEvent).detail);
});

window.addEventListener("error", (event) => {
  if (event.error) scheduleRecover(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) scheduleRecover(event.reason);
});

const recoverIfRootIsBlank = () => {
  window.setTimeout(() => {
    const rootEl = document.getElementById("root");
    if (!rootEl || rootEl.childElementCount === 0 || !rootEl.textContent?.trim()) {
      scheduleRecover("Blank root after page resume");
    }
  }, 600);
};

mountApp();

window.setTimeout(() => {
  sessionStorage.removeItem("printloco:chunk-reload-attempted");
}, 8000);

// Recover from cached/blank bfcache pages after sleep/wake or reopening a tab.
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) scheduleRecover("Restored from browser cache");
  recoverIfRootIsBlank();
});
window.addEventListener("focus", recoverIfRootIsBlank);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") recoverIfRootIsBlank();
});
