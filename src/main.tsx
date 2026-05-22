import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

const renderHardFallback = () => {
  document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px;background:#fff;color:#111"><section style="max-width:420px;text-align:center"><h1>Something didn’t load</h1><p>Please reload the page or go back home.</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:700">Reload page</button><a href="/" style="padding:12px 18px;border:1px solid #ddd;border-radius:12px;color:#111;text-decoration:none;font-weight:700">Go home</a></div></section></main>';
};

window.addEventListener("error", () => {
  if (!rootElement?.hasChildNodes()) renderHardFallback();
});

window.addEventListener("unhandledrejection", () => {
  if (!rootElement?.hasChildNodes()) renderHardFallback();
});

if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );

  window.setTimeout(() => {
    if (!rootElement.hasChildNodes()) renderHardFallback();
  }, 4000);
} else {
  renderHardFallback();
}
