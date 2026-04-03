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
    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    if (!COHERE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "COHERE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, messages, systemPrompt } = await req.json();

    if (!action || !messages) {
      return new Response(
        JSON.stringify({ error: "Missing action or messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Cohere v2 messages format
    const cohereMessages: any[] = [];
    if (systemPrompt) {
      cohereMessages.push({ role: "system", content: systemPrompt });
    }
    for (const msg of messages) {
      cohereMessages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min timeout

    try {
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cohere API error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Cohere error: ${response.status} - ${errorText.slice(0, 200)}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      // Cohere v2 response format
      const textContent = data.message?.content?.[0]?.text || "";

      return new Response(
        JSON.stringify({ content: textContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeout);
      if (fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Request timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
