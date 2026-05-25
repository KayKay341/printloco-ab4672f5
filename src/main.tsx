import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const runtime = window as typeof window & {
  __printlocoRoot?: Root;
  __printlocoRootContainer?: HTMLElement;
  __printlocoBootAbort?: AbortController;
  __printlocoObserver?: MutationObserver;
  __printlocoInterval?: number;
};

let reactRoot: Root | null = runtime.__printlocoRoot ?? null;
let rootContainer: HTMLElement | null = runtime.__printlocoRootContainer ?? null;
let recoveryCheckQueued = false;

const RECOVERY_RELOAD_KEY = "printloco:last-recovery-reload";
const RECOVERY_RELOAD_COOLDOWN_MS = 10000;

const ensureRootElement = () => {
  let rootElement = document.getElementById("root");

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.prepend(rootElement);
  }

  return rootElement;
};

const renderHardFallback = () => {
  ensureRootElement().innerHTML = '<main data-hard-fallback="true" style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;background:#fff;color:#111"><section style="max-width:420px;text-align:center"><h1>PrintLoco is ready</h1><p>The preview connection paused. Reload if it does not resume automatically.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:700">Reload page</button><a href="/" style="padding:12px 18px;border:1px solid #ddd;border-radius:12px;color:#111;text-decoration:none;font-weight:700">Go home</a></div></section></main>';
};

const RootApp = () => {
  useEffect(() => {
    document.documentElement.dataset.printlocoMounted = "true";
    return () => {
      delete document.documentElement.dataset.printlocoMounted;
    };
  }, []);

  return (
    <div data-printloco-app="true">
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </div>
  );
};

const renderApp = () => {
  const rootElement = ensureRootElement();

  if (!reactRoot || rootContainer !== rootElement) {
    reactRoot = createRoot(rootElement);
    rootContainer = rootElement;
    runtime.__printlocoRoot = reactRoot;
    runtime.__printlocoRootContainer = rootElement;
  }

  reactRoot.render(<RootApp />);
};

const rootLooksBroken = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement || !rootElement.isConnected) return true;
  if (rootElement.querySelector("[data-hard-fallback='true']")) return true;
  if (!rootElement.hasChildNodes()) return true;
  return !rootElement.querySelector("[data-printloco-app='true']");
};

const reloadToRecover = () => {
  const now = Date.now();
  const lastReload = Number(window.sessionStorage.getItem(RECOVERY_RELOAD_KEY) ?? 0);

  if (now - lastReload > RECOVERY_RELOAD_COOLDOWN_MS) {
    window.sessionStorage.setItem(RECOVERY_RELOAD_KEY, String(now));
    window.location.reload();
    return;
  }

  renderHardFallback();
};

const recoverIfBlank = () => {
  if (document.visibilityState === "hidden" || recoveryCheckQueued) return;

  recoveryCheckQueued = true;
  window.setTimeout(() => {
    recoveryCheckQueued = false;
    if (rootLooksBroken()) reloadToRecover();
  }, 300);
};

runtime.__printlocoBootAbort?.abort();
runtime.__printlocoObserver?.disconnect();
if (runtime.__printlocoInterval) window.clearInterval(runtime.__printlocoInterval);

const bootAbort = new AbortController();
runtime.__printlocoBootAbort = bootAbort;
const bootSignal = bootAbort.signal;
const recoverOnVisible = () => {
  if (document.visibilityState === "visible") recoverIfBlank();
};

window.addEventListener("error", recoverIfBlank, { signal: bootSignal });
window.addEventListener("unhandledrejection", recoverIfBlank, { signal: bootSignal });
window.addEventListener("pageshow", recoverIfBlank, { signal: bootSignal });
window.addEventListener("focus", recoverIfBlank, { signal: bootSignal });
window.addEventListener("online", recoverIfBlank, { signal: bootSignal });
document.addEventListener("visibilitychange", recoverOnVisible, { signal: bootSignal });

runtime.__printlocoObserver = new MutationObserver(recoverIfBlank);
runtime.__printlocoObserver.observe(document.body, { childList: true });

try {
  renderApp();

  window.setTimeout(recoverIfBlank, 4000);

  runtime.__printlocoInterval = window.setInterval(recoverIfBlank, 2500);
} catch {
  renderHardFallback();
}
