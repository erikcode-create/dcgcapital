import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file_path } = await req.json();
    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the file from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("pitch-decks")
      .download(file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file: " + (downloadError?.message || "unknown") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 in chunks to avoid stack overflow
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    // Determine mime type
    const ext = file_path.split(".").pop()?.toLowerCase();
    let mimeType = "application/pdf";
    if (ext === "pptx") mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (ext === "ppt") mimeType = "application/vnd.ms-powerpoint";
    else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Send to AI for extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a deal analysis assistant for a private equity firm. Extract key deal information from pitch decks and investment memos. Return ONLY valid JSON with these fields (use null for unknown values):
{
  "name": "Company or deal name",
  "description": "Brief 1-2 sentence description of the business",
  "sector": "Industry sector (e.g., Technology, Healthcare, Industrials, Consumer, Financial Services)",
  "deal_type": "One of: buyout, growth_equity, recapitalization, add_on, platform",
  "geography": "Geographic location",
  "enterprise_value": numeric value in dollars or null,
  "ebitda": numeric value in dollars or null,
  "revenue": numeric value in dollars or null,
  "investment_amount": numeric value in dollars or null,
  "target_return": "Target return as string (e.g., '3x MOIC' or '25% IRR') or null",
  "contact_name": "Key contact name or null",
  "contact_email": "Contact email or null",
  "notes": "Additional key points, investment thesis highlights, risks"
}
Return ONLY the JSON object, no markdown, no code fences.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract deal information from this pitch deck / investment document:",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI extraction failed: " + errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON from AI response
    let dealData;
    try {
      // Strip any markdown code fences just in case
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      dealData = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the deal
    const dealPayload = {
      name: dealData.name || "Untitled Deal",
      description: dealData.description || null,
      sector: dealData.sector || null,
      deal_type: dealData.deal_type || "buyout",
      geography: dealData.geography || null,
      enterprise_value: dealData.enterprise_value || null,
      ebitda: dealData.ebitda || null,
      revenue: dealData.revenue || null,
      investment_amount: dealData.investment_amount || null,
      target_return: dealData.target_return || null,
      contact_name: dealData.contact_name || null,
      contact_email: dealData.contact_email || null,
      notes: dealData.notes || null,
      stage: "sourcing",
      status: "active",
      created_by: caller.id,
    };

    const { data: newDeal, error: insertError } = await adminClient
      .from("deals")
      .insert(dealPayload)
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, deal: newDeal, extracted: dealData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
