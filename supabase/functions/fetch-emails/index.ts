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
  if (!res.ok) {
    throw new Error(`Token error [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

const MAILBOX = "data@fitzcap.co";

async function classifyEmailWithAI(subject: string, bodyPreview: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("No LOVABLE_API_KEY, defaulting to equity");
    return "equity";
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an email classifier for a private equity / investment firm. Classify emails into exactly one category based on the deal type being discussed. Respond with ONLY one of these exact words: equity, debt, revenue_seeking

- equity: Deals involving equity investments, buyouts, acquisitions, mergers, equity fundraising, venture capital, growth equity
- debt: Deals involving loans, credit facilities, bonds, mezzanine financing, debt restructuring, refinancing
- revenue_seeking: Companies seeking revenue growth, partnerships, business development, sales opportunities, service offerings

If unclear, default to "equity".`,
          },
          {
            role: "user",
            content: `Subject: ${subject || "(No Subject)"}\n\nPreview: ${bodyPreview || "(No preview)"}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI classification failed:", response.status);
      return "equity";
    }

    const data = await response.json();
    const result = (data.choices?.[0]?.message?.content || "equity").trim().toLowerCase();
    if (["equity", "debt", "revenue_seeking"].includes(result)) {
      return result;
    }
    return "equity";
  } catch (err) {
    console.error("AI classification error:", err);
    return "equity";
  }
}

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller using getClaims
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

    // Get the last synced email time
    const { data: lastEmail } = await supabase
      .from("emails")
      .select("received_at")
      .eq("folder", "inbox")
      .order("received_at", { ascending: false })
      .limit(1)
      .single();

    const accessToken = await getAccessToken();

    // Fetch emails from Graph API
    let url = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId,isDraft`;

    if (lastEmail?.received_at) {
      const filterDate = new Date(lastEmail.received_at).toISOString();
      url += `&$filter=receivedDateTime gt ${filterDate}`;
    }

    const graphRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const graphData = await graphRes.json();
    if (!graphRes.ok) {
      throw new Error(`Graph API error [${graphRes.status}]: ${JSON.stringify(graphData)}`);
    }

    const emails = graphData.value || [];
    let inserted = 0;

    // Track new inbox email IDs for auto-processing
    const newInboxEmailIds: string[] = [];

    for (const email of emails) {
      const record = {
        microsoft_id: email.id,
        subject: email.subject || "(No Subject)",
        from_address: email.from?.emailAddress?.address || "",
        from_name: email.from?.emailAddress?.name || "",
        to_addresses: (email.toRecipients || []).map((r: any) => ({
          name: r.emailAddress?.name,
          address: r.emailAddress?.address,
        })),
        cc_addresses: (email.ccRecipients || []).map((r: any) => ({
          name: r.emailAddress?.name,
          address: r.emailAddress?.address,
        })),
        body_preview: email.bodyPreview || "",
        body_html: email.body?.contentType === "html" ? email.body?.content : null,
        body_text: email.body?.contentType === "text" ? email.body?.content : email.bodyPreview,
        received_at: email.receivedDateTime,
        sent_at: email.sentDateTime,
        is_read: email.isRead || false,
        has_attachments: email.hasAttachments || false,
        importance: email.importance || "normal",
        folder: "inbox",
        conversation_id: email.conversationId || null,
        is_draft: email.isDraft || false,
      };

      const { data: upsertData, error } = await supabase
        .from("emails")
        .upsert(record, { onConflict: "microsoft_id" })
        .select("id")
        .single();

      if (!error) {
        inserted++;
        if (upsertData?.id) {
          newInboxEmailIds.push(upsertData.id);
        }
      }
    }

    // Also fetch sent items
    const sentUrl = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders/sentItems/messages?$top=50&$orderby=sentDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,bodyPreview,body,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId,isDraft`;

    const sentRes = await fetch(sentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sentData = await sentRes.json();

    if (sentRes.ok && sentData.value) {
      for (const email of sentData.value) {
        const record = {
          microsoft_id: email.id,
          subject: email.subject || "(No Subject)",
          from_address: email.from?.emailAddress?.address || "",
          from_name: email.from?.emailAddress?.name || "",
          to_addresses: (email.toRecipients || []).map((r: any) => ({
            name: r.emailAddress?.name,
            address: r.emailAddress?.address,
          })),
          cc_addresses: (email.ccRecipients || []).map((r: any) => ({
            name: r.emailAddress?.name,
            address: r.emailAddress?.address,
          })),
          body_preview: email.bodyPreview || "",
          body_html: email.body?.contentType === "html" ? email.body?.content : null,
          body_text: email.body?.contentType === "text" ? email.body?.content : email.bodyPreview,
          received_at: email.receivedDateTime,
          sent_at: email.sentDateTime,
          is_read: true,
          has_attachments: email.hasAttachments || false,
          importance: email.importance || "normal",
          folder: "sent",
          conversation_id: email.conversationId || null,
          is_draft: email.isDraft || false,
        };

        const { error } = await supabase
          .from("emails")
          .upsert(record, { onConflict: "microsoft_id" });

        if (!error) inserted++;
      }
    }

    // ========== AUTO-CATEGORIZE UNCATEGORIZED EMAILS ==========
    // Build conversation_id -> category map from already-categorized emails
    const { data: categorizedEmails } = await supabase
      .from("emails")
      .select("conversation_id, category")
      .not("category", "is", null)
      .not("conversation_id", "is", null);

    const convCategoryMap: Record<string, string> = {};
    if (categorizedEmails) {
      for (const e of categorizedEmails) {
        if (e.conversation_id && e.category) {
          convCategoryMap[e.conversation_id] = e.category;
        }
      }
    }

    // Get ALL uncategorized inbox emails (not just new ones)
    const { data: uncategorizedEmails } = await supabase
      .from("emails")
      .select("id, subject, body_preview, conversation_id, category")
      .eq("folder", "inbox")
      .is("category", null);

    if (uncategorizedEmails) {
      for (const email of uncategorizedEmails) {
        let category: string;
        if (email.conversation_id && convCategoryMap[email.conversation_id]) {
          category = convCategoryMap[email.conversation_id];
        } else {
          category = await classifyEmailWithAI(email.subject || "", email.body_preview || "");
          if (email.conversation_id) {
            convCategoryMap[email.conversation_id] = category;
          }
        }
        await supabase.from("emails").update({ category }).eq("id", email.id);
      }
    }

    // ========== AUTO-LINK & AUTO-CONVERT ==========
    // Build conversation_id -> deal_id map from existing deals
    const { data: dealsWithEmails } = await supabase
      .from("deals")
      .select("id, source_email_id")
      .not("source_email_id", "is", null);

    const convDealMap: Record<string, string> = {};

    if (dealsWithEmails && dealsWithEmails.length > 0) {
      // Also build map from deal_emails table (catches all linked conversations)
      const { data: allDealEmailLinks } = await supabase
        .from("deal_emails")
        .select("deal_id, email_id");

      if (allDealEmailLinks && allDealEmailLinks.length > 0) {
        const linkedEmailIds = allDealEmailLinks.map(l => l.email_id);
        const { data: linkedEmails } = await supabase
          .from("emails")
          .select("id, conversation_id")
          .in("id", linkedEmailIds)
          .not("conversation_id", "is", null);

        if (linkedEmails) {
          for (const le of linkedEmails) {
            const link = allDealEmailLinks.find(l => l.email_id === le.id);
            if (link && le.conversation_id) {
              convDealMap[le.conversation_id] = link.deal_id;
            }
          }
        }
      }

      // Also from source_email_id
      const sourceEmailIds = dealsWithEmails.map(d => d.source_email_id).filter(Boolean);
      const { data: sourceEmails } = await supabase
        .from("emails")
        .select("id, conversation_id")
        .in("id", sourceEmailIds)
        .not("conversation_id", "is", null);

      if (sourceEmails) {
        for (const se of sourceEmails) {
          const deal = dealsWithEmails.find(d => d.source_email_id === se.id);
          if (deal && se.conversation_id) {
            convDealMap[se.conversation_id] = deal.id;
          }
        }
      }

      // Auto-link all emails whose conversation_id maps to a deal
      const convIds = Object.keys(convDealMap);
      if (convIds.length > 0) {
        const { data: matchingEmails } = await supabase
          .from("emails")
          .select("id, conversation_id")
          .in("conversation_id", convIds);

        if (matchingEmails) {
          const linkInserts = matchingEmails
            .filter(e => e.conversation_id && convDealMap[e.conversation_id])
            .map(e => ({
              deal_id: convDealMap[e.conversation_id!],
              email_id: e.id,
              linked_by: "auto",
            }));

          if (linkInserts.length > 0) {
            await supabase
              .from("deal_emails")
              .upsert(linkInserts, { onConflict: "deal_id,email_id" });
          }
        }
      }
    }

    // Now auto-convert ALL unlinked inbox emails (not just new ones)
    const { data: allUnlinkedEmails } = await supabase
      .from("emails")
      .select("id, conversation_id, category, subject")
      .eq("folder", "inbox");

    if (allUnlinkedEmails) {
      const { data: allLinked } = await supabase
        .from("deal_emails")
        .select("email_id");

      const linkedSet = new Set((allLinked || []).map(d => d.email_id));

      for (const email of allUnlinkedEmails) {
        if (linkedSet.has(email.id)) continue;
        if (email.conversation_id && convDealMap[email.conversation_id]) continue;

        try {
          const convertUrl = `${supabaseUrl}/functions/v1/convert-email-to-deal`;
          const convertRes = await fetch(convertUrl, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            },
            body: JSON.stringify({
              email_id: email.id,
              category: email.category || "equity",
            }),
          });

          if (convertRes.ok) {
            const convertData = await convertRes.json();
            console.log(`Auto-converted email "${email.subject}" to deal: ${convertData.deal?.name || "unknown"}`);
            if (email.conversation_id && convertData.deal?.id) {
              convDealMap[email.conversation_id] = convertData.deal.id;
            }
            // Add to linked set so subsequent emails in same batch don't re-convert
            linkedSet.add(email.id);
          } else {
            console.error(`Auto-convert failed for email ${email.id}:`, await convertRes.text());
          }
        } catch (err) {
          console.error(`Auto-convert error for email ${email.id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, fetched: emails.length, sentFetched: sentData.value?.length || 0, inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching emails:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
