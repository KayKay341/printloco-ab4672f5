import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const RECOVERY_RELOAD_KEY = "printloco:recovery-reload-attempted";

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

const markBooted = () => {
  const rootEl = ensureRoot();
  rootEl.dataset.printlocoMounted = "true";
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

const reloadOnce = () => {
  if (!storage.get(RECOVERY_RELOAD_KEY)) {
    storage.set(RECOVERY_RELOAD_KEY, "true");
    window.location.replace(window.location.href);
    return true;
  }
  return false;
};

const scheduleRecover = (reason?: unknown) => {
  if (isChunkLoadError(reason)) {
    reloadOnce();
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
    if (!rootEl || rootEl.childElementCount === 0 || !rootEl.textContent?.trim()) {
      reloadOnce();
    }
  }, 600);
};

createRoot(ensureRoot()).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
window.setTimeout(markBooted, 0);

// Recover from cached/blank bfcache pages after sleep/wake or reopening a tab.
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) recoverIfRootIsBlank();
  recoverIfRootIsBlank();
});
window.addEventListener("focus", recoverIfRootIsBlank);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") recoverIfRootIsBlank();
});
