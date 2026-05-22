import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} else {
  document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;padding:24px"><section style="max-width:420px;text-align:center"><h1>Something didn’t load</h1><p>Please reload the page.</p><button onclick="window.location.reload()" style="padding:12px 18px;border:0;border-radius:12px;background:#111;color:#fff;font-weight:700">Reload page</button></section></main>';
}
