/**
 * fetch-model — server-side proxy for downloading a remote .stl / .3mf file.
 * Bypasses CORS, validates the URL, and enforces a 50MB cap.
 *
 * Public endpoint (verify_jwt = false in supabase/config.toml).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_REDIRECTS = 5;

const PRIVATE_HOST_RE =
  /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc00:|fe80:)/i;

function isPrivateHost(hostname: string): boolean {
  if (!hostname) return true;
  if (PRIVATE_HOST_RE.test(hostname)) return true;
  // Block bare numeric IPv4 patterns that look private
  return false;
}

function pickFileName(url: URL, contentDisposition: string | null): string {
  if (contentDisposition) {
    const m = contentDisposition.match(/filename\*?=(?:UTF-\d['']*)?"?([^";]+)"?/i);
    if (m) return decodeURIComponent(m[1].trim());
  }
  const last = url.pathname.split("/").filter(Boolean).pop();
  if (last && /\.(stl|3mf)(\?|$)/i.test(last)) return last.split("?")[0];
  return "model.stl";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let url: string;
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response(JSON.stringify({ error: "Only http(s) URLs are allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (isPrivateHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: "URL host is not allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Manual redirect handling so we can re-validate each hop.
  let currentUrl = parsed;
  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(currentUrl.toString(), {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "PrintLoco-FetchModel/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (!loc) break;
      const next = new URL(loc, currentUrl);
      if (isPrivateHost(next.hostname) || (next.protocol !== "http:" && next.protocol !== "https:")) {
        return new Response(JSON.stringify({ error: "Redirect target not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      currentUrl = next;
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    return new Response(
      JSON.stringify({ error: `Source responded with ${response?.status ?? "no response"}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "File exceeds 50MB" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Stream + size guard.
  const reader = response.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({ error: "Empty response body" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > MAX_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      return new Response(JSON.stringify({ error: "File exceeds 50MB" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    chunks.push(value);
  }

  // Concatenate.
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const fileName = pickFileName(currentUrl, response.headers.get("content-disposition"));
  // Lowercase extension check
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".stl") && !lower.endsWith(".3mf")) {
    return new Response(
      JSON.stringify({ error: "URL did not return a .stl or .3mf file" }),
      { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Encode to base64 in chunks (avoid call-stack overflow on big arrays).
  const b64 = bytesToBase64(merged);

  return new Response(
    JSON.stringify({
      fileName,
      contentType: lower.endsWith(".3mf") ? "model/3mf" : "model/stl",
      sizeBytes: total,
      base64: b64,
      sourceUrl: currentUrl.toString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
