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
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden: Admin only");

    const { to, cc, subject, body, replyToId } = await req.json();

    if (!to || !subject || !body) {
      throw new Error("Missing required fields: to, subject, body");
    }

    const accessToken = await getAccessToken();

    const toRecipients = (Array.isArray(to) ? to : [to]).map((addr: string) => ({
      emailAddress: { address: addr },
    }));

    const ccRecipients = cc
      ? (Array.isArray(cc) ? cc : [cc]).map((addr: string) => ({
          emailAddress: { address: addr },
        }))
      : [];

    const message: any = {
      subject,
      body: {
        contentType: "HTML",
        content: body,
      },
      toRecipients,
      ccRecipients,
    };

    let url: string;
    if (replyToId) {
      // Reply to an existing email
      url = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${replyToId}/reply`;
      const graphRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, comment: body }),
      });

      if (!graphRes.ok) {
        const errData = await graphRes.text();
        throw new Error(`Graph reply error [${graphRes.status}]: ${errData}`);
      }
      await graphRes.text();
    } else {
      // Send new email
      url = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/sendMail`;
      const graphRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      });

      if (!graphRes.ok) {
        const errData = await graphRes.text();
        throw new Error(`Graph send error [${graphRes.status}]: ${errData}`);
      }
      await graphRes.text();
    }

    // Log the sent email locally
    const { error: insertError } = await supabase.from("emails").insert({
      microsoft_id: `sent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      subject,
      from_address: MAILBOX,
      from_name: "Fitzpatrick Capital Partners",
      to_addresses: toRecipients.map((r: any) => ({ address: r.emailAddress.address })),
      cc_addresses: ccRecipients.map((r: any) => ({ address: r.emailAddress.address })),
      body_html: body,
      body_text: body.replace(/<[^>]*>/g, ""),
      body_preview: body.replace(/<[^>]*>/g, "").slice(0, 200),
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      is_read: true,
      folder: "sent",
      in_reply_to: replyToId || null,
    });

    if (insertError) {
      console.error("Failed to log sent email:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
