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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_id, extract_deal_fields } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the document record
    const { data: doc, error: docError } = await supabase
      .from("deal_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also fetch the current deal data for context
    const { data: deal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", doc.deal_id)
      .single();

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pitch-decks")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download file: " + (downloadError?.message || "unknown") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    const contentType = doc.content_type || "application/pdf";

    // Build the system prompt based on whether we need deal field extraction
    let systemPrompt: string;
    if (extract_deal_fields) {
      systemPrompt = `You are a document analyst for an investment firm. Analyze the uploaded document and:

1. Provide a comprehensive summary for investors
2. Extract structured deal data that should be populated into the deal record

Current deal data:
- Name: ${deal?.name || "Unknown"}
- Description: ${deal?.description || "None"}
- Sector: ${deal?.sector || "None"}
- Geography: ${deal?.geography || "None"}
- Deal Type: ${deal?.deal_type || "None"}
- Enterprise Value: ${deal?.enterprise_value || "None"}
- EBITDA: ${deal?.ebitda || "None"}
- Revenue: ${deal?.revenue || "None"}
- Investment Amount: ${deal?.investment_amount || "None"}
- Target Return: ${deal?.target_return || "None"}
- Contact Name: ${deal?.contact_name || "None"}
- Contact Email: ${deal?.contact_email || "None"}
- Category: ${deal?.category || "equity"}

Return a JSON object with exactly these two fields:
{
  "summary": "Your comprehensive markdown-formatted analysis including: Document Overview, Company/Deal Summary, Key Financials, Investment Highlights, Risk Factors, and Key Takeaways",
  "suggested_fields": {
    "description": "suggested description or null if current is better",
    "sector": "suggested sector or null",
    "geography": "suggested geography or null",
    "deal_type": "one of: buyout, growth_equity, recapitalization, add_on, platform, revenue_seeking — or null",
    "enterprise_value": numeric value in dollars or null,
    "ebitda": numeric value in dollars or null,
    "revenue": numeric value in dollars or null,
    "investment_amount": numeric value in dollars or null,
    "target_return": "target return string or null",
    "contact_name": "contact name or null",
    "contact_email": "contact email or null",
    "category": "one of: equity, debt, revenue_seeking — or null",
    "notes": "additional insights to append to notes, or null"
  }
}

ONLY suggest field values that you found in the document and that are BETTER than or MISSING from the current deal data. Set fields to null if the current value is already good or the document doesn't contain that information.

Return ONLY the JSON object, no markdown code fences.`;
    } else {
      systemPrompt = `You are a document analyst for an investment firm. Analyze the uploaded document and provide a comprehensive summary that would be useful for investors evaluating this deal. Include:

1. **Document Overview** — What type of document this is and its purpose
2. **Company/Deal Summary** — Key information about the company or deal
3. **Key Financials** — Any financial data, metrics, revenue, EBITDA, growth rates
4. **Investment Highlights** — Strengths, competitive advantages, market opportunity
5. **Risk Factors** — Any risks, concerns, or red flags identified
6. **Key Takeaways** — 3-5 bullet points summarizing the most important findings

Format using markdown for readability. Be thorough but concise. If certain information is not present in the document, note that it was not included.`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this document titled "${doc.file_name}" and provide ${extract_deal_fields ? "a summary with suggested deal field updates" : "a comprehensive investor-ready summary"}:`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${contentType};base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices?.[0]?.message?.content || "";

    let summary: string;
    let suggestedFields: any = null;

    if (extract_deal_fields) {
      try {
        const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        summary = parsed.summary || rawContent;
        suggestedFields = parsed.suggested_fields || null;
      } catch {
        summary = rawContent;
      }
    } else {
      summary = rawContent;
    }

    // Save summary to the document record
    await supabase
      .from("deal_documents")
      .update({ ai_summary: summary })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({ success: true, summary, suggested_fields: suggestedFields }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error analyzing document:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
