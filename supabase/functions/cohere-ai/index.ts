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

    const cohereMessages = [];
    
    if (systemPrompt) {
      cohereMessages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      cohereMessages.push({ role: msg.role, content: msg.content });
    }

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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cohere API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Cohere API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract text content from Cohere response
    let textContent = "";
    if (data.message?.content) {
      for (const block of data.message.content) {
        if (block.type === "text") {
          textContent += block.text;
        }
      }
    }

    return new Response(
      JSON.stringify({ content: textContent }),
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
