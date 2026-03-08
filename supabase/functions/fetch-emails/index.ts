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

      const { error } = await supabase
        .from("emails")
        .upsert(record, { onConflict: "microsoft_id" });

      if (!error) inserted++;
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
