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

    // Try Cohere first
    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    if (COHERE_API_KEY) {
      try {
        const cohereMessages: any[] = [];
        if (systemPrompt) {
          cohereMessages.push({ role: "system", content: systemPrompt });
        }
        for (const msg of messages) {
          cohereMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

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
        }

        // If Cohere returned 5xx or empty, fall through to Lovable AI
        console.warn("Cohere failed with status:", response.status, "- falling back to Lovable AI");
      } catch (cohereErr) {
        console.warn("Cohere error, falling back:", cohereErr);
      }
    }

    // Fallback: Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "No AI provider available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableMessages: any[] = [];
    if (systemPrompt) {
      lovableMessages.push({ role: "system", content: systemPrompt });
    }
    for (const msg of messages) {
      lovableMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
    }

    const lovableResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: lovableMessages,
      }),
    });

    if (!lovableResponse.ok) {
      const errText = await lovableResponse.text();
      console.error("Lovable AI error:", lovableResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI error: ${lovableResponse.status}` }),
        { status: lovableResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableData = await lovableResponse.json();
    const content = lovableData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
