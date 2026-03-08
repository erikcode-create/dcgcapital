import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAccessToken(): Promise<string> {
  const tenantId = Deno.env.get("AZURE_TENANT_ID");
  const clientId = Deno.env.get("AZURE_CLIENT_ID");
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Azure credentials");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const MAILBOX = "data@fitzcap.co";

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

    const { email_id, category } = await req.json();
    if (!email_id) {
      return new Response(JSON.stringify({ error: "email_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email record
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("*")
      .eq("id", email_id)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the email category
    if (category) {
      await supabase.from("emails").update({ category }).eq("id", email_id);
    }

    // Fetch attachments from Microsoft Graph
    const accessToken = await getAccessToken();
    const attachmentsUrl = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${email.microsoft_id}/attachments`;
    const attachRes = await fetch(attachmentsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const attachData = await attachRes.json();
    const attachments = attachData.value || [];

    // Upload attachments to storage and collect info for AI
    const uploadedFiles: { path: string; name: string; mimeType: string; base64: string }[] = [];

    for (const att of attachments) {
      if (att["@odata.type"] !== "#microsoft.graph.fileAttachment") continue;
      if (!att.contentBytes) continue;

      const fileName = att.name || "attachment";
      const filePath = `${Date.now()}-${fileName}`;
      const mimeType = att.contentType || "application/octet-stream";

      // Decode base64 to upload to storage
      const binaryStr = atob(att.contentBytes);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from("pitch-decks")
        .upload(filePath, bytes.buffer, { contentType: mimeType });

      if (!uploadError) {
        uploadedFiles.push({
          path: filePath,
          name: fileName,
          mimeType,
          base64: att.contentBytes,
        });
      } else {
        console.error("Upload error for", fileName, uploadError.message);
      }
    }

    // Build AI prompt with email body and attachment contents
    const emailContext = `
EMAIL SUBJECT: ${email.subject || "(No Subject)"}
FROM: ${email.from_name || ""} <${email.from_address || ""}>
DATE: ${email.received_at || ""}
BODY:
${email.body_text || email.body_preview || ""}
`;

    // Build message content for AI - include email text + any document attachments
    const userContent: any[] = [
      {
        type: "text",
        text: `Analyze this email and its attachments to extract deal information. This email has been categorized as "${category || "uncategorized"}".

${emailContext}

${uploadedFiles.length > 0 ? `This email has ${uploadedFiles.length} attachment(s): ${uploadedFiles.map(f => f.name).join(", ")}` : "This email has no attachments."}

Extract all deal information you can find from the email and attachments.`,
      },
    ];

    // Add document attachments as images for AI to analyze
    for (const file of uploadedFiles) {
      const supportedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "image/png",
        "image/jpeg",
        "image/gif",
      ];
      if (supportedTypes.some(t => file.mimeType.includes(t)) || file.mimeType.startsWith("image/")) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${file.mimeType};base64,${file.base64}`,
          },
        });
      }
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
          {
            role: "system",
            content: `You are a deal analysis assistant for an investment firm. Extract key deal information from emails and their attachments. Return ONLY valid JSON with these fields (use null for unknown values):
{
  "name": "Company or deal name",
  "description": "Brief 1-2 sentence description of the business/opportunity",
  "sector": "Industry sector (e.g., Technology, Healthcare, Industrials, Consumer, Financial Services)",
  "deal_type": "One of: buyout, growth_equity, recapitalization, add_on, platform, revenue_seeking",
  "geography": "Geographic location",
  "enterprise_value": numeric value in dollars or null,
  "ebitda": numeric value in dollars or null,
  "revenue": numeric value in dollars or null,
  "investment_amount": numeric value in dollars or null,
  "target_return": "Target return as string or null",
  "contact_name": "Key contact name from the email sender or content",
  "contact_email": "Contact email from the sender",
  "notes": "Additional key points, investment thesis highlights, risks, summary of the opportunity"
}
Return ONLY the JSON object, no markdown, no code fences.`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      // If AI fails, still create a basic deal from email info
    }

    let dealData: any = {};
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content || "";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        dealData = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI response:", content);
      }
    }

    // Fallback: use email info if AI didn't extract
    const dealPayload = {
      name: dealData.name || email.subject || "Untitled Deal",
      description: dealData.description || email.body_preview || null,
      sector: dealData.sector || null,
      deal_type: dealData.deal_type || (category === "revenue_seeking" ? "revenue_seeking" : "buyout"),
      geography: dealData.geography || null,
      enterprise_value: dealData.enterprise_value || null,
      ebitda: dealData.ebitda || null,
      revenue: dealData.revenue || null,
      investment_amount: dealData.investment_amount || null,
      target_return: dealData.target_return || null,
      contact_name: dealData.contact_name || email.from_name || null,
      contact_email: dealData.contact_email || email.from_address || null,
      notes: dealData.notes || null,
      pitch_deck_path: uploadedFiles.length > 0 ? uploadedFiles[0].path : null,
      stage: "sourcing",
      status: "active",
      created_by: userId,
      source_email_id: email_id,
    };

    const { data: newDeal, error: insertError } = await supabase
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
      JSON.stringify({
        success: true,
        deal: newDeal,
        attachments_uploaded: uploadedFiles.length,
        extracted: dealData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error converting email to deal:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
