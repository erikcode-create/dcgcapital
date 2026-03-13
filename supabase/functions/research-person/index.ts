// ABOUTME: Edge function that uses AI to research a person associated with a deal.
// ABOUTME: Returns structured research (professional background, news, social media, red flags).

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

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { data: isAdmin } = await serviceClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deal_id, person_name, person_role, person_email } = await req.json();
    if (!deal_id || !person_name) {
      return new Response(JSON.stringify({ error: "deal_id and person_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load deal for context
    const { data: deal } = await serviceClient
      .from("deals")
      .select("name, sector, geography, description")
      .eq("id", deal_id)
      .single();

    const dealContext = deal
      ? `Company/Deal: ${deal.name}, Sector: ${deal.sector || "unknown"}, Geography: ${deal.geography || "unknown"}, Description: ${deal.description || "none"}`
      : "";

    const prompt = `You are a due diligence research analyst. Research the following person and provide a comprehensive background report.

PERSON: ${person_name}
${person_email ? `EMAIL: ${person_email}` : ""}
${person_role ? `ROLE: ${person_role}` : ""}
${dealContext ? `CONTEXT: ${dealContext}` : ""}

Provide a thorough research report with these four sections. Use your training data knowledge to provide the most accurate and detailed information available. If you cannot find specific information, clearly state that.

Respond with a JSON object containing exactly these four fields:
1. "professional_background" - A detailed summary of the person's professional history, education, current role, notable positions held, board memberships, and relevant qualifications. Include company names, titles, and approximate dates where possible.
2. "news_mentions" - A summary of notable news coverage, press releases, interviews, conference appearances, publications, or media mentions involving this person. Include context about what the coverage was about.
3. "social_media_presence" - A summary of their public social media and online presence including thought leadership, published articles, speaking engagements, and public opinions or positions they've taken.
4. "red_flags" - Any concerns such as involvement in lawsuits, regulatory issues, failed businesses, controversies, negative press, conflicts of interest, or other items that an investor should be aware of during due diligence. If none found, say "No red flags identified in available data."

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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional due diligence research analyst. Return only valid JSON." },
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
      return new Response(JSON.stringify({ error: "AI research failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const cleaned = rawContent.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(JSON.stringify({ error: "Failed to parse AI research response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert research record
    const researchRow = {
      deal_id,
      person_name,
      person_role: person_role || null,
      person_email: person_email || null,
      professional_background: parsed.professional_background || null,
      news_mentions: parsed.news_mentions || null,
      social_media_presence: parsed.social_media_presence || null,
      red_flags: parsed.red_flags || null,
      researched_at: new Date().toISOString(),
    };

    // Check if research already exists for this person on this deal
    const { data: existing } = await serviceClient
      .from("deal_people_research")
      .select("id")
      .eq("deal_id", deal_id)
      .eq("person_name", person_name)
      .maybeSingle();

    if (existing) {
      await serviceClient
        .from("deal_people_research")
        .update(researchRow)
        .eq("id", existing.id);
    } else {
      await serviceClient
        .from("deal_people_research")
        .insert(researchRow);
    }

    return new Response(JSON.stringify({ success: true, ...researchRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("research-person error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
