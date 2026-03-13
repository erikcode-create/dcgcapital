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

    const prompt = `You are a world-class investigative due diligence researcher. Your job is to produce an exhaustive, deeply researched intelligence report on this person. Leave no stone unturned.

PERSON: ${person_name}
${person_email ? `EMAIL: ${person_email}` : ""}
${person_role ? `ROLE: ${person_role}` : ""}
${dealContext ? `CONTEXT: ${dealContext}` : ""}

RESEARCH INSTRUCTIONS:
- Search broadly across all possible name variations, spellings, and associated entities.
- Cross-reference the person's name with their company, industry, geography, and known associates.
- Look for corporate filings, regulatory records, court records, patent filings, academic publications, and any public records.
- Search for the person on LinkedIn, Twitter/X, Crunchbase, AngelList, PitchBook, Bloomberg, and other professional databases.
- Check for involvement in startups, investments, board seats, advisory roles, non-profits, and government positions.
- Look for conference talks, podcast appearances, blog posts, op-eds, and interviews.
- If the person is relatively unknown, note that explicitly and provide whatever fragments of information exist, including likely profiles and possible associations based on context clues (company, role, email domain, geography).

Respond with a JSON object containing exactly these four fields:

1. "professional_background" - EXTREMELY detailed. Include: full career timeline with company names, titles, and dates. Education (university, degree, year). Board memberships, advisory roles. Certifications, licenses. Company founding history. Investment track record if applicable. Known associates, co-founders, or partners. LinkedIn profile URL if identifiable. Size/stage of companies they've been involved with. Key accomplishments and failures. If limited info found, say exactly what was and wasn't findable and why.

2. "news_mentions" - EXTREMELY detailed. Include: every identifiable news article, press release, interview, podcast, conference talk, panel discussion, publication, or media appearance. Include the source name, approximate date, and topic for each mention. Look for trade publications, local news, industry blogs, and niche media—not just major outlets. If no coverage found, explain what was searched.

3. "social_media_presence" - EXTREMELY detailed. Include: identified social media profiles (LinkedIn, Twitter/X, GitHub, Medium, Substack, personal blog, YouTube). Posting frequency and topics. Follower count estimates. Notable posts or threads. Thought leadership areas. Online community involvement. Public speaking or content creation. If profiles can't be confirmed, note potential matches and why they may or may not be the right person.

4. "red_flags" - EXTREMELY thorough. Check for: lawsuits (plaintiff or defendant), regulatory actions, SEC filings or enforcement, bankruptcy filings, tax liens, UCC filings, negative press, controversial statements, failed ventures, conflicts of interest, sanctions screening, politically exposed person (PEP) checks, adverse media screening. For each finding, provide the source and context. If the person has a very thin public profile, flag that as a potential concern for due diligence. If nothing found, state: "No red flags identified. Note: limited public information available—recommend supplementary manual verification."

CRITICAL: Be exhaustive. A thin report is unacceptable. If information is genuinely scarce, explain in detail what you searched for and couldn't find—this is itself valuable intelligence.

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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an elite investigative due diligence researcher specializing in deep background checks for investment firms. You are thorough, meticulous, and never produce shallow reports. Return only valid JSON." },
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
