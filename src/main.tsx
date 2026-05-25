import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const ensureRoot = () => {
  let el = document.getElementById("root");
  if (!el) {
    el = document.createElement("div");
    el.id = "root";
    document.body.prepend(el);
  }
  return el;
};

const renderFallback = (message: string) => {
  ensureRoot().innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;background:#fff;color:#111"><section style="max-width:420px;text-align:center"><h1 style="font-size:22px;margin:0 0 8px">PrintLoco</h1><p style="margin:0 0 16px;color:#555">${message}</p><button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:700;cursor:pointer">Reload page</button></section></main>`;
};

try {
  createRoot(ensureRoot()).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (err) {
  console.error("Boot failed", err);
  renderFallback("Something went wrong loading the app. Please reload.");
}

// Recover from cached/blank bfcache pages after sleep/wake
window.addEventListener("pageshow", (e) => {
  if ((e as PageTransitionEvent).persisted) window.location.reload();
});
