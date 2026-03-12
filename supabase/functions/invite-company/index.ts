// ABOUTME: Edge function to invite a company contact to a deal's data room.
// ABOUTME: Creates user, assigns company role, seeds checklist, sends branded invite email via Microsoft Graph.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Default data request checklist template
const DATA_REQUEST_TEMPLATE = [
  // Financial Information
  { category: "Financial Information", label: "Audited Financial Statements (3 years)", description: "Income Statement, Balance Sheet, Cash Flow Statement for the last 3 years.", sort_order: 1 },
  { category: "Financial Information", label: "Unaudited Financials (YTD)", description: "Most recent unaudited year-to-date financial statements.", sort_order: 2 },
  { category: "Financial Information", label: "Revenue Breakdown", description: "Revenue breakdown by product/service, customer segment, or geography.", sort_order: 3 },
  { category: "Financial Information", label: "Financial Projections (1-3 years)", description: "Projections for the next 1-3 years, including key assumptions.", sort_order: 4 },
  { category: "Financial Information", label: "Outstanding Debt & Liabilities", description: "Details of outstanding debt, loans, or liabilities (terms, amounts, covenants).", sort_order: 5 },

  // Business Operations
  { category: "Business Operations", label: "Business Model Overview", description: "Overview of the company's business model, products/services, and target markets.", sort_order: 6 },
  { category: "Business Operations", label: "Key Customers & Contracts", description: "List of key customers (top 10 by revenue) and any significant contracts or agreements.", sort_order: 7 },
  { category: "Business Operations", label: "Supplier & Vendor Contracts", description: "Summary of supplier relationships and key vendor contracts.", sort_order: 8 },
  { category: "Business Operations", label: "Organizational Chart & Key Management", description: "Organizational chart and details of key management team members.", sort_order: 9 },

  // Legal and Compliance
  { category: "Legal and Compliance", label: "Incorporation Documents", description: "Copies of incorporation documents, bylaws, and shareholder agreements.", sort_order: 10 },
  { category: "Legal and Compliance", label: "Litigation & Disputes", description: "List of current or pending litigation, disputes, or regulatory issues.", sort_order: 11 },
  { category: "Legal and Compliance", label: "Intellectual Property", description: "Intellectual property details (patents, trademarks, copyrights) and ownership status.", sort_order: 12 },
  { category: "Legal and Compliance", label: "Material Contracts", description: "Material contracts (e.g., leases, partnerships, joint ventures).", sort_order: 13 },

  // Assets and Valuation
  { category: "Assets and Valuation", label: "Inventory List & Valuation", description: "Inventory list with current valuation (if applicable).", sort_order: 14 },
  { category: "Assets and Valuation", label: "Real Estate & Equipment", description: "Details of owned or leased real estate, equipment, or other significant assets.", sort_order: 15 },
  { category: "Assets and Valuation", label: "Appraisals & Valuations", description: "Recent appraisals or valuations of the business or its assets (if available).", sort_order: 16 },

  // Market and Competitive Positioning
  { category: "Market and Competitive Positioning", label: "Competitive Landscape", description: "Overview of the competitive landscape and primary competitors.", sort_order: 17 },
  { category: "Market and Competitive Positioning", label: "Market Research & Industry Reports", description: "Any recent market research, industry reports, or growth trends relevant to the business.", sort_order: 18 },

  // Tax Information
  { category: "Tax Information", label: "Federal & State Tax Returns (3 years)", description: "Federal and state income tax returns for the last 3 years (including all schedules).", sort_order: 19 },
  { category: "Tax Information", label: "Sales Tax Filings (3 years)", description: "Sales tax filings for the last 3 years.", sort_order: 20 },
  { category: "Tax Information", label: "Payroll Tax Filings (3 years)", description: "Payroll tax filings for the last 3 years (e.g., Forms 941, 940).", sort_order: 21 },
  { category: "Tax Information", label: "Property Tax Returns", description: "Property tax returns and assessments (if applicable).", sort_order: 22 },
  { category: "Tax Information", label: "Tax Authority Correspondence", description: "Any correspondence with tax authorities regarding audits, disputes, or settlements.", sort_order: 23 },
  { category: "Tax Information", label: "NOL Carryforward Schedules", description: "Net operating losses (NOLs) carryforward schedules, if applicable.", sort_order: 24 },
  { category: "Tax Information", label: "Tax Basis of Assets", description: "Tax basis of significant assets (including depreciation schedules).", sort_order: 25 },
  { category: "Tax Information", label: "Tax Credits & Incentives", description: "Details of any tax credits, incentives, or special elections claimed.", sort_order: 26 },
];

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
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const adminUserId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: adminUserId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, company_name, deal_id, contact_name } = await req.json();

    if (!email || !deal_id) {
      return new Response(JSON.stringify({ error: "Email and deal_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the deal name for the email
    const { data: dealData, error: dealError } = await adminClient
      .from("deals")
      .select("name")
      .eq("id", deal_id)
      .single();

    if (dealError || !dealData) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Ensure they have the company role
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "company")
        .maybeSingle();

      if (!existingRole) {
        // Delete any existing investor role (the handle_new_user trigger may have added it)
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.from("user_roles").insert({ user_id: userId, role: "company" });
      }
    } else {
      // Create new user with a random password (they'll use magic link)
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: contact_name || company_name || email },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = newUser.user.id;

      // The handle_new_user trigger adds investor role by default — replace it with company
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("user_roles").insert({ user_id: userId, role: "company" });

      // Update profile with company info
      if (company_name) {
        await adminClient.from("profiles").update({ company: company_name }).eq("id", userId);
      }
    }

    // Create deal assignment (link company user to deal)
    const { data: existingAssignment } = await adminClient
      .from("deal_assignments")
      .select("id")
      .eq("deal_id", deal_id)
      .eq("investor_id", userId)
      .maybeSingle();

    if (!existingAssignment) {
      await adminClient.from("deal_assignments").insert({
        deal_id,
        investor_id: userId,
      });
    }

    // Seed data request items for this deal (only if not already seeded)
    const { data: existingItems } = await adminClient
      .from("data_request_items")
      .select("id")
      .eq("deal_id", deal_id)
      .limit(1);

    if (!existingItems || existingItems.length === 0) {
      const items = DATA_REQUEST_TEMPLATE.map((item) => ({
        ...item,
        deal_id,
      }));
      await adminClient.from("data_request_items").insert(items);
    }

    // Record the invitation
    await adminClient.from("company_invitations").insert({
      deal_id,
      email,
      company_name: company_name || null,
      invited_by: adminUserId,
      status: "pending",
    });

    // Build the login URL for the company user
    const portalUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/login`;

    // Send branded invitation email via Microsoft Graph
    const accessToken = await getAccessToken();
    const dealName = dealData.name;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-family:Georgia,serif;font-size:24px;color:#2d1654;margin:0;">Fitzpatrick Capital Partners</h1>
        <p style="color:#6b5f7a;font-size:13px;margin-top:4px;">Confidential Data Room</p>
      </div>

      <p style="color:#2d1654;font-size:16px;line-height:1.6;">
        You have been invited to submit documents for <strong>${dealName}</strong>.
      </p>

      <p style="color:#4a4158;font-size:14px;line-height:1.6;">
        To assist in effectively representing your business and preparing for the transaction process, we have prepared a secure data room where you can upload the requested documents at your convenience. All information will be treated with the utmost confidentiality.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${magicLinkUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b1a6e,#1f0e3d);color:#f0e8d8;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:500;">
          Access Data Room
        </a>
      </div>

      <p style="color:#6b5f7a;font-size:13px;line-height:1.5;">
        Click the button above to access the data room. Sign in with your email and the password provided to you. If you have any questions about the requested documents, please reply to this email.
      </p>

      <hr style="border:none;border-top:1px solid #e8e0d6;margin:32px 0;" />

      <p style="color:#9a8fa6;font-size:11px;text-align:center;">
        This is a confidential communication from Fitzpatrick Capital Partners. Do not forward this email.
      </p>
    </div>
  </div>
</body>
</html>`;

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/sendMail`;
    const graphRes = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: `Document Request — ${dealName}`,
          body: { contentType: "HTML", content: emailHtml },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const errData = await graphRes.text();
      console.error("Graph send error:", errData);
      // Don't fail the whole operation — user was created and assigned
    }

    // Log the sent email locally
    await adminClient.from("emails").insert({
      microsoft_id: `invite_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      subject: `Document Request — ${dealName}`,
      from_address: MAILBOX,
      from_name: "Fitzpatrick Capital Partners",
      to_addresses: [{ address: email }],
      body_html: emailHtml,
      body_text: `You have been invited to submit documents for ${dealName}. Access your data room to get started.`,
      body_preview: `You have been invited to submit documents for ${dealName}.`,
      sent_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      is_read: true,
      folder: "sent",
    });

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error inviting company:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
