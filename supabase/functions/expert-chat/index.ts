import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, messages: existingMessages, context } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build messages array - support both single message and array format
    const chatMessages = existingMessages && Array.isArray(existingMessages) 
      ? existingMessages 
      : message 
        ? [{ role: "user", content: message }]
        : [];

    if (chatMessages.length === 0) {
      return new Response(
        JSON.stringify({ content: "Hello! I'm your solar energy expert. Ask me anything about solar panels, savings, or grants in Ireland!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add system prompt for solar expertise
    const systemPrompt = {
      role: "system",
      content: `You are a friendly Irish solar energy expert for AISOLAR. You help homeowners understand solar panel benefits, SEAI grants (€2,100 for systems ≥4kWp), electricity savings, and payback periods. Keep responses concise (2-3 sentences) and encouraging. Always mention that uploading their bill gives personalized savings estimates.${context ? ` Context: ${JSON.stringify(context)}` : ''}`
    };

    const allMessages = [systemPrompt, ...chatMessages];

    console.log("Expert chat request with", chatMessages.length, "user messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: allMessages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", content: "I'm getting a lot of questions right now! Please try again in a moment, or upload your bill for instant analysis." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I apologize, I couldn't generate a response.";

    console.log("Expert chat response generated successfully");

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Expert chat error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        content: "I'm having trouble connecting. Please upload your bill above for a free personalized analysis!"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
