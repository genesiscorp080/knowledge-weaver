import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripHtml(html: string): string {
  // Remove scripts/styles entirely
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ")
              .replace(/<style[\s\S]*?<\/style>/gi, " ")
              .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Remove all tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode common entities
  s = s.replace(/&nbsp;/g, " ")
       .replace(/&amp;/g, "&")
       .replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">")
       .replace(/&quot;/g, "\"")
       .replace(/&#39;/g, "'");
  return s.replace(/\s+/g, " ").trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PriscaBot/1.0)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${resp.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ctype = (resp.headers.get("content-type") || "").toLowerCase();
    const isPdf = ctype.includes("application/pdf") || url.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      const buf = new Uint8Array(await resp.arrayBuffer());
      // Cap at 20 MB to avoid memory issues
      if (buf.byteLength > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "PDF trop volumineux (>20 Mo)" }), {
          status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ kind: "pdf", base64: bytesToBase64(buf), contentType: "application/pdf" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const text = stripHtml(await resp.text()).slice(0, 200000);
    return new Response(JSON.stringify({ kind: "text", text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});