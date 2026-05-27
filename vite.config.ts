import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const diagnosticsPreflight = () => ({
  name: "printloco-diagnostics-preflight",
  transformIndexHtml() {
    return [
      {
        tag: "script",
        injectTo: "body-prepend" as const,
        children: String.raw`(function(){
  if (window.__PRINTLOCO_DIAGNOSTICS_READY__) return;
  window.__PRINTLOCO_DIAGNOSTICS_READY__ = true;
  var key = "printloco:diagnostics-log";
  var max = 30;
  function safeText(value) {
    if (value instanceof Error) return value.stack || value.message;
    if (typeof value === "string") return value;
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(key, JSON.stringify(items.slice(-max))); } catch (_) {}
  }
  function record(type, message, detail) {
    var entry = {
      id: Date.now() + ":" + Math.random().toString(36).slice(2),
      time: new Date().toISOString(),
      type: type,
      message: String(message || "Unknown issue").slice(0, 1200),
      detail: detail ? String(detail).slice(0, 2400) : "",
      url: location.href,
      online: navigator.onLine,
      visibility: document.visibilityState
    };
    var items = read();
    items.push(entry);
    write(items);
    return entry;
  }
  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, function(char) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char];
    });
  }
  function isChunkLike(value) {
    return /failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|vite:preloaderror|module script/i.test(safeText(value));
  }
  function render(reason) {
    var root = document.getElementById("root");
    if (!root || root.childElementCount > 0 || root.textContent.trim()) return;
    record("blank-screen", safeText(reason || "Root stayed empty before React mounted"));
    var rows = read().slice(-10).reverse().map(function(item) {
      return '<li style="padding:10px 0;border-top:1px solid rgba(15,23,42,.12)"><strong style="display:block;color:#0f172a">' + escapeHtml(item.type) + '</strong><span style="display:block;color:#475569;font-size:12px;margin-top:2px">' + escapeHtml(new Date(item.time).toLocaleString()) + '</span><code style="display:block;white-space:pre-wrap;word-break:break-word;color:#334155;font-size:12px;margin-top:6px">' + escapeHtml(item.message) + '</code></li>';
    }).join("") || '<li style="padding-top:10px;color:#64748b">No diagnostics recorded yet.</li>';
    root.innerHTML = '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><section style="width:min(760px,100%);background:white;border:1px solid rgba(15,23,42,.14);border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,.14);padding:28px"><p style="margin:0 0 8px;color:#0f766e;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">PrintLoco diagnostics</p><h1 style="margin:0;font-size:clamp(28px,4vw,44px);line-height:1.05">The app did not finish loading.</h1><p style="margin:12px 0 0;color:#475569;line-height:1.6">This screen is here so the page never stays blank. Use the diagnostics below to see the exact browser errors, failed module loads, and reload attempts.</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:22px"><button id="pl-reload" type="button" style="border:0;border-radius:10px;background:#0f172a;color:white;padding:12px 16px;font-weight:800;cursor:pointer">Reload homepage</button><a href="/" style="border:1px solid rgba(15,23,42,.18);border-radius:10px;color:#0f172a;padding:12px 16px;font-weight:800;text-decoration:none">Go home</a></div><details open style="margin-top:24px"><summary style="cursor:pointer;font-weight:800">Recent diagnostics</summary><ul style="list-style:none;margin:12px 0 0;padding:0;max-height:320px;overflow:auto">' + rows + '</ul></details></section></main>';
    var button = document.getElementById("pl-reload");
    if (button) button.addEventListener("click", function(){ record("manual-reload", "User reloaded from diagnostics panel"); location.href = "/?_pl_manual_reload=" + Date.now(); });
  }
  var originalError = console.error;
  console.error = function(){ record("console-error", Array.prototype.map.call(arguments, safeText).join(" ")); return originalError.apply(console, arguments); };
  window.__PRINTLOCO_DIAGNOSTICS__ = { record: record, read: read, render: render };
  window.addEventListener("error", function(event) {
    var target = event.target;
    if (target && (target.tagName === "SCRIPT" || target.tagName === "LINK")) record("network-chunk-failure", target.src || target.href || "Resource failed");
    else record("window-error", safeText(event.error || event.message));
  }, true);
  window.addEventListener("unhandledrejection", function(event) { record(isChunkLike(event.reason) ? "network-chunk-failure" : "promise-rejection", safeText(event.reason)); });
  window.addEventListener("vite:preloadError", function(event) { record("network-chunk-failure", safeText(event.payload || "Vite preload failed")); });
  setTimeout(function(){ render("React did not mount within 9 seconds"); }, 9000);
})();`,
      },
    ];
  },
});

const hmrHost = process.env.__LOVABLE_PROJECT_ID ? `${process.env.__LOVABLE_PROJECT_ID}.lovableproject.com` : undefined;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: hmrHost
        ? {
            protocol: "wss",
            host: hmrHost,
            clientPort: 443,
            overlay: false,
          }
        : { overlay: false },
      warmup: {
        clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/pages/Index.tsx", "./src/components/site/*.tsx"],
      },
    },
    plugins: [diagnosticsPreflight(), react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
