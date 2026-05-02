import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, systemPrompt } = await req.json();

    if (!action || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing action or messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const chatMessages: any[] = [];
    if (systemPrompt) chatMessages.push({ role: "system", content: systemPrompt });
    for (const msg of messages) {
      chatMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
    }

    // --- Provider 1: Cohere (primary if key works) ---
    const tryCohere = async (): Promise<{ ok: boolean; content?: string; status?: number; body?: string }> => {
      if (!COHERE_API_KEY) return { ok: false, status: 0, body: "no key" };
      const maxAttempts = 2;
      let lastStatus = 0;
      let lastBody = "";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 180000);
          const response = await fetch("https://api.cohere.com/v2/chat", {
            method: "POST",
            headers: { Authorization: `Bearer ${COHERE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "command-a-03-2025", messages: chatMessages }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            const textContent = data.message?.content?.[0]?.text || "";
            if (textContent) return { ok: true, content: textContent };
            lastStatus = 200; lastBody = "Empty response";
          } else {
            lastStatus = response.status;
            lastBody = await response.text();
            console.warn(`Cohere attempt ${attempt + 1} failed: ${response.status}`);
            // 429 = quota épuisée => bascule immédiate
            if (response.status === 429) break;
            if (response.status >= 400 && response.status < 500 && response.status !== 408) break;
          }
        } catch (err) {
          lastBody = err instanceof Error ? err.message : String(err);
          console.warn(`Cohere attempt ${attempt + 1} error:`, lastBody);
        }
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt) + Math.random() * 500));
      }
      return { ok: false, status: lastStatus, body: lastBody };
    };

    // --- Provider 2: Lovable AI Gateway (fallback, no monthly quota) ---
    const tryLovable = async (): Promise<{ ok: boolean; content?: string; status?: number; body?: string }> => {
      if (!LOVABLE_API_KEY) return { ok: false, status: 0, body: "no LOVABLE_API_KEY" };
      const maxAttempts = 3;
      let lastStatus = 0;
      let lastBody = "";
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 180000);
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-2.5-pro", messages: chatMessages }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            const textContent = data.choices?.[0]?.message?.content || "";
            if (textContent) return { ok: true, content: textContent };
            lastStatus = 200; lastBody = "Empty response";
          } else {
            lastStatus = response.status;
            lastBody = await response.text();
            console.warn(`Lovable AI attempt ${attempt + 1} failed: ${response.status}`);
            if (response.status === 402) {
              return { ok: false, status: 402, body: "Crédits IA épuisés. Veuillez ajouter des crédits dans Lovable Cloud." };
            }
            if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) break;
          }
        } catch (err) {
          lastBody = err instanceof Error ? err.message : String(err);
          console.warn(`Lovable AI attempt ${attempt + 1} error:`, lastBody);
        }
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt) + Math.random() * 500));
      }
      return { ok: false, status: lastStatus, body: lastBody };
    };

    // Try Cohere first, fallback to Lovable AI on any failure
    const cohereResult = await tryCohere();
    if (cohereResult.ok) {
      return new Response(
        JSON.stringify({ content: cohereResult.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.warn(`Cohere failed (${cohereResult.status}), falling back to Lovable AI Gateway`);
    const lovableResult = await tryLovable();
    if (lovableResult.ok) {
      return new Response(
        JSON.stringify({ content: lovableResult.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: `Tous les fournisseurs IA sont indisponibles. Cohere: ${cohereResult.status} ${String(cohereResult.body).slice(0, 120)}. Lovable AI: ${lovableResult.status} ${String(lovableResult.body).slice(0, 120)}`,
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
