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
const RECOVERY_RELOAD_COOLDOWN_MS = 30000;

const ensureRootElement = () => {
  let rootElement = document.getElementById("root");

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.prepend(rootElement);
  }

  return rootElement;
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
  if (!rootElement.hasChildNodes()) return true;
  return !rootElement.querySelector("[data-printloco-app='true']");
};

const reloadToRecover = async () => {
  const now = Date.now();
  const lastReload = Number(window.sessionStorage.getItem(RECOVERY_RELOAD_KEY) ?? 0);

  if (now - lastReload <= RECOVERY_RELOAD_COOLDOWN_MS || document.visibilityState === "hidden") return;

  try {
    const ready = await fetch("/", {
      method: "GET",
      cache: "no-store",
      headers: { accept: "text/x-vite-ping" },
    });
    if (!ready.ok && ready.status !== 204) return;
  } catch {
    return;
  }

  window.sessionStorage.setItem(RECOVERY_RELOAD_KEY, String(now));
  window.location.reload();
};

const rerenderToRecover = () => {
  try {
    renderApp();
  } catch {
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
      runtime.__printlocoRoot = undefined;
      renderApp();
    }
  }
};

const repairOrReload = () => {
  rerenderToRecover();

  window.setTimeout(() => {
    if (rootLooksBroken()) void reloadToRecover();
  }, 700);
};

const recoverIfBlank = () => {
  if (document.visibilityState === "hidden" || recoveryCheckQueued) return;

  recoveryCheckQueued = true;
  window.setTimeout(() => {
    recoveryCheckQueued = false;
    if (rootLooksBroken()) repairOrReload();
  }, 500);
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

  runtime.__printlocoInterval = window.setInterval(recoverIfBlank, 4000);
} catch {
  void reloadToRecover();
}
