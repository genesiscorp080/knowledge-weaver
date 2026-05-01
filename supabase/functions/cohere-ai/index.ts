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

    // Cohere only — retries with backoff on 5xx, no fallback to other providers
    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    if (!COHERE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "COHERE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cohereMessages: any[] = [];
    if (systemPrompt) {
      cohereMessages.push({ role: "system", content: systemPrompt });
    }
    for (const msg of messages) {
      cohereMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
    }

    const maxAttempts = 4;
    let lastStatus = 0;
    let lastBody = "";
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000);
        const response = await fetch("https://api.cohere.com/v2/chat", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "command-a-03-2025",
            messages: cohereMessages,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const textContent = data.message?.content?.[0]?.text || "";
          if (textContent) {
            return new Response(
              JSON.stringify({ content: textContent }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          lastStatus = 200;
          lastBody = "Empty response";
        } else {
          lastStatus = response.status;
          lastBody = await response.text();
          console.warn(`Cohere attempt ${attempt + 1} failed: ${response.status}`);
          // Don't retry on client errors (4xx except 408/429)
          if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
            break;
          }
        }
      } catch (err) {
        lastBody = err instanceof Error ? err.message : String(err);
        console.warn(`Cohere attempt ${attempt + 1} error:`, lastBody);
      }
      // Exponential backoff with jitter
      const delay = Math.min(15000, 1500 * Math.pow(2, attempt)) + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
    }

    return new Response(
      JSON.stringify({ error: `Cohere unavailable after retries (status ${lastStatus}): ${lastBody.slice(0, 200)}` }),
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
