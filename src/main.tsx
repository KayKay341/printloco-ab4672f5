import { createRoot, type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const RECOVERY_RELOAD_KEY = "printloco:recovery-reload-attempted";
const DIAGNOSTICS_KEY = "printloco:diagnostics-log";
const DIAGNOSTICS_LIMIT = 30;

type PrintLocoDiagnostic = {
  id: string;
  time: string;
  type: string;
  message: string;
  detail?: string;
  url: string;
  online: boolean;
  visibility: DocumentVisibilityState;
};

declare global {
  interface Window {
    __PRINTLOCO_RECOVER__?: (reason?: unknown) => void;
    __PRINTLOCO_DIAGNOSTICS_READY__?: boolean;
    __PRINTLOCO_DIAGNOSTICS__?: {
      record: (type: string, message: unknown, detail?: unknown) => PrintLocoDiagnostic;
      read: () => PrintLocoDiagnostic[];
      render: (reason?: unknown) => void;
    };
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

const markBooted = () => {
  const rootEl = ensureRoot();
  rootEl.dataset.printlocoMounted = "true";
  rootEl.dataset.printlocoBootStartedAt = "";
  try {
    sessionStorage.removeItem(RECOVERY_RELOAD_KEY);
  } catch {
    // Ignore storage failures; rendering should never depend on storage access.
  }
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

const readDiagnostics = (): PrintLocoDiagnostic[] => {
  try {
    return JSON.parse(localStorage.getItem(DIAGNOSTICS_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeDiagnostics = (items: PrintLocoDiagnostic[]) => {
  try {
    localStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(items.slice(-DIAGNOSTICS_LIMIT)));
  } catch {
    // Diagnostics are helpful, but the app must still boot if storage is blocked.
  }
};

const safeText = (value: unknown) => {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const recordDiagnostic = (type: string, message: unknown, detail?: unknown): PrintLocoDiagnostic => {
  const existingRecorder = window.__PRINTLOCO_DIAGNOSTICS__?.record;
  if (existingRecorder && existingRecorder !== recordDiagnostic) return existingRecorder(type, message, detail);

  const entry: PrintLocoDiagnostic = {
    id: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
    time: new Date().toISOString(),
    type,
    message: safeText(message).slice(0, 1200),
    detail: detail ? safeText(detail).slice(0, 2400) : "",
    url: window.location.href,
    online: navigator.onLine,
    visibility: document.visibilityState,
  };
  const items = readDiagnostics();
  items.push(entry);
  writeDiagnostics(items);
  return entry;
};

const getDiagnosticLog = () => {
  const existingReader = window.__PRINTLOCO_DIAGNOSTICS__?.read;
  return existingReader ? existingReader() : readDiagnostics();
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);

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

const renderDiagnosticsPanel = (reason?: unknown) => {
  const rootEl = ensureRoot();
  const renderWithNativePanel = window.__PRINTLOCO_DIAGNOSTICS__?.render;
  if (renderWithNativePanel && renderWithNativePanel !== renderDiagnosticsPanel) {
    renderWithNativePanel(reason);
    return;
  }

  recordDiagnostic("blank-screen", describeReason(reason));
  const entries = getDiagnosticLog().slice(-10).reverse();
  const rows = entries.length
    ? entries
        .map(
          (entry) => `
            <li style="padding:10px 0;border-top:1px solid rgba(15,23,42,.12)">
              <strong style="display:block;color:#0f172a">${escapeHtml(entry.type)}</strong>
              <span style="display:block;color:#475569;font-size:12px;margin-top:2px">${escapeHtml(new Date(entry.time).toLocaleString())}</span>
              <code style="display:block;white-space:pre-wrap;word-break:break-word;color:#334155;font-size:12px;margin-top:6px">${escapeHtml(entry.message)}</code>
            </li>`,
        )
        .join("")
    : '<li style="padding-top:10px;color:#64748b">No diagnostics recorded yet.</li>';

  rootEl.dataset.printlocoMounted = "diagnostics";
  rootEl.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">
      <section style="width:min(760px,100%);background:white;border:1px solid rgba(15,23,42,.14);border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,.14);padding:28px">
        <p style="margin:0 0 8px;color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">PrintLoco diagnostics</p>
        <h1 style="margin:0;font-size:clamp(28px,4vw,44px);line-height:1.05">The homepage did not finish loading.</h1>
        <p style="margin:12px 0 0;color:#475569;line-height:1.6">This panel replaces the blank screen and records console errors, failed chunks, and reload attempts.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:22px">
          <button id="printloco-reload" type="button" style="border:0;border-radius:10px;background:#0f172a;color:white;padding:12px 16px;font-weight:800;cursor:pointer">Reload homepage</button>
          <button id="printloco-clear-diagnostics" type="button" style="border:1px solid rgba(15,23,42,.18);border-radius:10px;background:white;color:#0f172a;padding:12px 16px;font-weight:800;cursor:pointer">Clear diagnostics</button>
        </div>
        <details open style="margin-top:24px">
          <summary style="cursor:pointer;font-weight:800">Recent diagnostics</summary>
          <ul style="list-style:none;margin:12px 0 0;padding:0;max-height:320px;overflow:auto">${rows}</ul>
        </details>
      </section>
    </main>`;

  document.getElementById("printloco-reload")?.addEventListener("click", () => {
    recordDiagnostic("manual-reload", "User reloaded from the diagnostics panel");
    window.location.href = `/?_pl_manual_reload=${Date.now()}`;
  });
  document.getElementById("printloco-clear-diagnostics")?.addEventListener("click", () => {
    writeDiagnostics([]);
    window.location.reload();
  });
};

if (!window.__PRINTLOCO_DIAGNOSTICS__) {
  window.__PRINTLOCO_DIAGNOSTICS__ = {
    record: recordDiagnostic,
    read: readDiagnostics,
    render: renderDiagnosticsPanel,
  };
}

const reloadOnce = (reason?: unknown) => {
  recordDiagnostic("reload-attempt", describeReason(reason));
  if (!storage.get(RECOVERY_RELOAD_KEY)) {
    storage.set(RECOVERY_RELOAD_KEY, "true");
    window.location.replace(window.location.href);
    return true;
  }
  recordDiagnostic("reload-skipped", "A recovery reload was already attempted for this tab.");
  renderDiagnosticsPanel(reason);
  return false;
};

const scheduleRecover = (reason?: unknown) => {
  recordDiagnostic(isChunkLoadError(reason) ? "network-chunk-failure" : "recover-signal", describeReason(reason), reason);
  if (isChunkLoadError(reason)) {
    reloadOnce(reason);
  }
};

window.__PRINTLOCO_RECOVER__ = scheduleRecover;

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
      recordDiagnostic("network-chunk-failure", failedUrl);
      scheduleRecover(`Critical app resource failed to load: ${failedUrl}`);
      return;
    }
    if (event.error) {
      recordDiagnostic("window-error", describeReason(event.error), event.error);
      scheduleRecover(event.error);
    }
  },
  true,
);

window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) scheduleRecover(event.reason);
});

let reactRoot: Root | null = null;
let remountAttempts = 0;

const renderApp = (reason: string) => {
  const rootEl = ensureRoot();
  rootEl.dataset.printlocoMounted = "booting";
  rootEl.dataset.printlocoBootStartedAt = String(Date.now());

  try {
    reactRoot = reactRoot ?? createRoot(rootEl);
    reactRoot.render(
      <HelmetProvider>
        <App />
      </HelmetProvider>,
    );
    window.setTimeout(markBooted, 0);
    window.setTimeout(() => recoverIfRootIsBlank(`post-render check after ${reason}`), 2500);
  } catch (error) {
    recordDiagnostic("mount-error", describeReason(error), error);
    renderDiagnosticsPanel(error);
  }
};

const recoverIfRootIsBlank = (reason = "root recovery check") => {
  window.setTimeout(() => {
    const rootEl = document.getElementById("root");
    if (!rootEl || rootEl.childElementCount === 0 || !rootEl.textContent?.trim()) {
      recordDiagnostic("blank-screen", `The React root was empty during ${reason}.`);
      if (remountAttempts < 2) {
        remountAttempts += 1;
        recordDiagnostic("remount-attempt", `Trying React remount ${remountAttempts} of 2.`);
        try {
          reactRoot?.unmount();
        } catch (error) {
          recordDiagnostic("remount-unmount-error", describeReason(error), error);
        }
        reactRoot = null;
        ensureRoot().replaceChildren();
        renderApp(`blank root remount ${remountAttempts}`);
        return;
      }
      if (!reloadOnce("React root stayed blank after remount attempts.")) {
        renderDiagnosticsPanel("React root stayed blank after remount attempts.");
      }
    }
  }, 600);
};

renderApp("initial load");

// Recover from cached/blank bfcache pages after sleep/wake or reopening a tab.
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) recoverIfRootIsBlank();
  recoverIfRootIsBlank();
});
window.addEventListener("focus", () => recoverIfRootIsBlank("window focus"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") recoverIfRootIsBlank();
});
