import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

interface Candidate {
  title: string;
  thumburl: string;
  mime: string;
  credit: string;
}

async function searchCommons(query: string, lang: string): Promise<Candidate[]> {
  const api = "https://commons.wikimedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "1000",
    uselang: lang === "en" ? "en" : "fr",
  });
  const res = await fetch(`${api}?${params.toString()}`, {
    headers: { "User-Agent": "PriscaEdu/1.0 (educational document illustration)" },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const pages = json?.query?.pages ? Object.values<any>(json.query.pages) : [];
  const out: Candidate[] = [];
  for (const p of pages) {
    const info = p?.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const mime = String(info.mime || "");
    if (!/^image\/(jpeg|png)$/.test(mime)) continue;
    const meta = info.extmetadata || {};
    const artist = String(meta.Artist?.value || "").replace(/<[^>]+>/g, "").trim();
    const license = String(meta.LicenseShortName?.value || "").trim();
    out.push({
      title: String(p.title || "").replace(/^File:/, ""),
      thumburl: info.thumburl,
      mime,
      credit: [artist, license, "Wikimedia Commons"].filter(Boolean).join(" · "),
    });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query, language } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query manquante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const terms = [query, query.split(/[,;:(]/)[0].trim()].filter((t, i, a) => t && a.indexOf(t) === i);
    let candidates: Candidate[] = [];
    for (const term of terms) {
      candidates = await searchCommons(term, language || "fr");
      if (candidates.length > 0) break;
    }
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const c of candidates) {
      try {
        const imgRes = await fetch(c.thumburl, {
          headers: { "User-Agent": "PriscaEdu/1.0 (educational document illustration)" },
        });
        if (!imgRes.ok) continue;
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        if (buf.byteLength === 0 || buf.byteLength > 4_500_000) continue;
        const format = c.mime === "image/png" ? "PNG" : "JPEG";
        return new Response(
          JSON.stringify({
            found: true,
            dataUrl: `data:${c.mime};base64,${bytesToBase64(buf)}`,
            format,
            credit: c.credit,
            title: c.title,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (_e) {
        continue;
      }
    }

    return new Response(JSON.stringify({ found: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
