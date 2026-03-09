// ABOUTME: Edge function that aggregates deal data (emails, documents, notes) and calls AI
// ABOUTME: to generate a communications summary, concerns list, and missing data list.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Admin check
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deal_id } = await req.json();
    if (!deal_id) {
      return new Response(JSON.stringify({ error: "deal_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load deal
    const { data: deal, error: dealError } = await serviceClient
      .from("deals")
      .select("*")
      .eq("id", deal_id)
      .single();
    if (dealError || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load linked emails via deal_emails join
    const { data: dealEmails } = await serviceClient
      .from("deal_emails")
      .select("*, emails(*)")
      .eq("deal_id", deal_id);

    const emails = (dealEmails || [])
      .map((de: any) => de.emails)
      .filter(Boolean);

    // Load documents with AI summaries
    const { data: documents } = await serviceClient
      .from("deal_documents")
      .select("file_name, document_type, ai_summary, created_at")
      .eq("deal_id", deal_id);

    // Load notes
    const { data: notes } = await serviceClient
      .from("deal_notes")
      .select("content, note_type, created_at")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: true });

    // Build context for AI
    const emailSummaries = emails.map((e: any) =>
      `From: ${e.from_name || e.from_address} | Subject: ${e.subject} | Date: ${e.received_at || e.sent_at}\nPreview: ${e.body_preview || "(no preview)"}`
    ).join("\n---\n");

    const docSummaries = (documents || []).map((d: any) =>
      `Document: ${d.file_name} (${d.document_type || "other"})\nAI Summary: ${d.ai_summary || "(not analyzed)"}`
    ).join("\n---\n");

    const noteSummaries = (notes || []).map((n: any) =>
      `[${n.note_type}] ${n.content}`
    ).join("\n");

    const dealContext = `
Deal: ${deal.name}
Category: ${deal.category} | Stage: ${deal.stage} | Status: ${deal.status}
Sector: ${deal.sector || "unknown"} | Geography: ${deal.geography || "unknown"}
Deal Type: ${deal.deal_type || "unknown"}
Enterprise Value: ${deal.enterprise_value || "missing"}
EBITDA: ${deal.ebitda || "missing"}
Revenue: ${deal.revenue || "missing"}
Investment Amount: ${deal.investment_amount || "missing"}
Target Return: ${deal.target_return || "missing"}
Contact: ${deal.contact_name || "missing"} / ${deal.contact_email || "missing"}
Description: ${deal.description || "none"}
Notes: ${deal.notes || "none"}
`.trim();

    const prompt = `You are an investment analyst AI. Analyze this deal and its communications to produce a structured briefing.

DEAL INFORMATION:
${dealContext}

EMAILS (${emails.length} total):
${emailSummaries || "(no emails linked)"}

DOCUMENTS (${(documents || []).length} total):
${docSummaries || "(no documents)"}

INTERNAL NOTES:
${noteSummaries || "(no notes)"}

Respond with a JSON object containing exactly these three fields:
1. "communications_summary" - A 2-4 paragraph narrative summarizing the deal status, key communications, and overall picture. Write in professional investment memo style.
2. "concerns" - An array of strings, each describing a specific risk, red flag, or issue worth investigating. Be specific and actionable. Include 3-8 items.
3. "missing_data" - An array of strings, each describing a specific piece of information that would be helpful but is currently missing or incomplete. Include 3-8 items.

Return ONLY valid JSON, no markdown fences.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior investment analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted, please add funds" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response, stripping markdown fences if present
    let parsed: any;
    try {
      const cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert into deal_ai_summaries
    const summaryRow = {
      deal_id,
      communications_summary: parsed.communications_summary || null,
      concerns: parsed.concerns || [],
      missing_data: parsed.missing_data || [],
      generated_at: new Date().toISOString(),
      email_count: emails.length,
      document_count: (documents || []).length,
    };

    // Check if exists
    const { data: existing } = await serviceClient
      .from("deal_ai_summaries")
      .select("id")
      .eq("deal_id", deal_id)
      .maybeSingle();

    if (existing) {
      await serviceClient
        .from("deal_ai_summaries")
        .update(summaryRow)
        .eq("deal_id", deal_id);
    } else {
      await serviceClient
        .from("deal_ai_summaries")
        .insert(summaryRow);
    }

    return new Response(JSON.stringify({ success: true, ...summaryRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-deal-overview error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
