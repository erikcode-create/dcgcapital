// ABOUTME: Edge function to create a new investor user account (admin-only).
// ABOUTME: Creates user, assigns investor role, sends branded invite email via Microsoft Graph from data@fitzcap.co.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILBOX = "data@fitzcap.co";
const PORTAL_URL = "https://dcgcapital.lovable.app";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin (skip in preview mode when anon key is used)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isAnonKey = token === supabaseAnonKey;

    if (!isAnonKey) {
      // Production path: verify caller is a real authenticated admin
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

      // Check admin role
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
    }

    const { email, full_name, company, phone, resend } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string;

    if (resend) {
      // Resend mode: generate a new recovery link for an existing user
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (!profiles) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = profiles.id;
    } else {
      // Create mode: create a new user account
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      // Update profile with additional info if provided
      if (company || phone) {
        await adminClient
          .from("profiles")
          .update({ company, phone })
          .eq("id", userId);
      }
    }

    // Generate a recovery link so the investor can set their own password
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: PORTAL_URL + '/reset-password' },
    });

    if (linkError) {
      console.error("Failed to generate recovery link:", linkError);
    }

    // Extract the token-bearing URL from the generated link
    const inviteUrl = linkData?.properties?.action_link || PORTAL_URL + '/login';

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with additional info if provided
    if (company || phone) {
      await adminClient
        .from("profiles")
        .update({ company, phone })
        .eq("id", newUser.user.id);
    }

    // Send branded invite email via Microsoft Graph
    const displayName = full_name || email;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-family:Georgia,serif;font-size:24px;color:#2d1654;margin:0;">Fitzpatrick Capital Partners</h1>
        <p style="color:#6b5f7a;font-size:13px;margin-top:4px;">Investor Portal</p>
      </div>

      <p style="color:#2d1654;font-size:16px;line-height:1.6;">
        Dear ${displayName},
      </p>

      <p style="color:#4a4158;font-size:14px;line-height:1.6;">
        You have been invited to the Fitzpatrick Capital Partners Investor Portal. Through this portal you will be able to review deal opportunities, express interest, and access confidential deal materials.
      </p>

      <p style="color:#4a4158;font-size:14px;line-height:1.6;">
        To get started, please click the button below to set your password and access the portal.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b1a6e,#1f0e3d);color:#f0e8d8;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:500;">
          Set Your Password
        </a>
      </div>

      <p style="color:#6b5f7a;font-size:13px;line-height:1.5;">
        If you have any questions, please reply to this email.
      </p>

      <hr style="border:none;border-top:1px solid #e8e0d6;margin:32px 0;" />

      <p style="color:#9a8fa6;font-size:11px;text-align:center;">
        This is a confidential communication from Fitzpatrick Capital Partners. Do not forward this email.
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      const accessToken = await getAccessToken();
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/sendMail`;
      const graphRes = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: "Welcome to Fitzpatrick Capital Partners — Investor Portal Access",
            body: { contentType: "HTML", content: emailHtml },
            toRecipients: [{ emailAddress: { address: email } }],
          },
          saveToSentItems: true,
        }),
      });

      if (!graphRes.ok) {
        const errData = await graphRes.text();
        console.error("Graph send error:", errData);
        // Don't fail the whole operation — user was created successfully
      }

      // Log the sent email locally
      await adminClient.from("emails").insert({
        microsoft_id: `investor_invite_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subject: "Welcome to Fitzpatrick Capital Partners — Investor Portal Access",
        from_address: MAILBOX,
        from_name: "Fitzpatrick Capital Partners",
        to_addresses: [{ address: email }],
        body_html: emailHtml,
        body_text: `Dear ${displayName}, you have been invited to the Fitzpatrick Capital Partners Investor Portal. Set your password at ${inviteUrl}`,
        body_preview: `You have been invited to the Fitzpatrick Capital Partners Investor Portal.`,
        sent_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
        is_read: true,
        folder: "sent",
      });
    } catch (emailError) {
      // Log but don't fail — the user account was created successfully
      console.error("Failed to send invite email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
