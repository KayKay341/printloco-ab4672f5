import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const bootGuard = () => ({
  name: "printloco-boot-guard",
  transformIndexHtml() {
    return [
      {
        tag: "script",
        injectTo: "body-prepend" as const,
        children: `(function(){
  var reloadTimer;
  function root(){return document.getElementById('root');}
  function hasVisibleApp(){var el=root();return !!(window.__PRINTLOCO_BOOT_OK__||el&&el.textContent&&el.textContent.trim()&&el.dataset.printlocoMounted==='true');}
  function fallback(){var el=root();if(!el)return;el.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;background:#fff8f0;color:#142033"><section style="max-width:440px;text-align:center;border:1px solid rgba(20,32,51,.14);border-radius:18px;padding:28px;background:white;box-shadow:0 18px 50px rgba(20,32,51,.10)"><h1 style="font-size:24px;margin:0 0 8px">PrintLoco is waking back up</h1><p style="margin:0 0 14px;color:#58657a;line-height:1.5">Your computer or the preview server was asleep, so this page is reconnecting automatically.</p><p style="margin:0;color:#ff6b35;font-size:13px;font-weight:700">Refreshing in a moment…</p></section></main>';}
  function recover(){if(hasVisibleApp())return;fallback();clearTimeout(reloadTimer);reloadTimer=setTimeout(function(){location.reload();},4000);}
  setTimeout(recover,12000);
  window.addEventListener('pageshow',function(){setTimeout(recover,900);});
  window.addEventListener('focus',function(){setTimeout(recover,900);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(recover,900);});
  window.addEventListener('online',function(){setTimeout(recover,900);});
})();`,
      },
    ];
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [bootGuard(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
