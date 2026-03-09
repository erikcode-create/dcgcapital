// ABOUTME: Public edge function to handle deal submissions from the website contact form.
// ABOUTME: Sends confirmation email via Resend from data@fitzcap.co and notifies the team.

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
    const {
      company_name,
      industry,
      annual_revenue,
      funding_needed,
      contact_name,
      contact_email,
      contact_phone,
      notes,
      pitch_deck_path,
    } = await req.json();

    // Validate required fields
    if (!company_name || !contact_email || !contact_name || !industry || !annual_revenue || !funding_needed) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send confirmation email to the submitter
    const confirmationHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
        <div style="border-bottom: 2px solid #2d1b69; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #2d1b69; margin: 0;">Fitzpatrick Capital Partners</h1>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #333;">Dear ${contact_name},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #333;">
          Thank you for submitting <strong>${company_name}</strong> for review. 
          We have received your information and our team will review it within 48 business hours.
        </p>
        <div style="background: #f8f6f3; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;"><strong>Submission Summary</strong></p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;">Company: ${company_name}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;">Industry: ${industry}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;">Revenue: ${annual_revenue}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;">Funding Needed: ${funding_needed}</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #333;">
          If you have any questions in the meantime, please reply to this email.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #333;">
          Best regards,<br/>
          <strong>Fitzpatrick Capital Partners</strong>
        </p>
        <div style="border-top: 1px solid #e0ddd8; margin-top: 30px; padding-top: 20px;">
          <p style="font-size: 11px; color: #999; margin: 0;">
            This is a confidential communication from Fitzpatrick Capital Partners.
          </p>
        </div>
      </div>
    `;

    const confirmRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fitzpatrick Capital Partners <data@fitzcap.co>",
        to: [contact_email],
        subject: `Submission Received — ${company_name}`,
        html: confirmationHtml,
      }),
    });

    if (!confirmRes.ok) {
      const errText = await confirmRes.text();
      console.error("Resend confirmation error:", confirmRes.status, errText);
    }

    // Send internal notification to the team
    const internalHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
        <h2 style="font-size: 18px; font-weight: 600; color: #2d1b69;">New Deal Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; font-size: 13px; color: #666; width: 140px;">Company</td><td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${company_name}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Industry</td><td style="padding: 8px 0; font-size: 13px;">${industry}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Annual Revenue</td><td style="padding: 8px 0; font-size: 13px;">${annual_revenue}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Funding Needed</td><td style="padding: 8px 0; font-size: 13px;">${funding_needed}</td></tr>
          <tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Contact</td><td style="padding: 8px 0; font-size: 13px;">${contact_name} — ${contact_email}${contact_phone ? ` — ${contact_phone}` : ""}</td></tr>
          ${pitch_deck_path ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Pitch Deck</td><td style="padding: 8px 0; font-size: 13px;">Uploaded</td></tr>` : ""}
          ${notes ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #666;">Notes</td><td style="padding: 8px 0; font-size: 13px;">${notes}</td></tr>` : ""}
        </table>
      </div>
    `;

    const internalRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Deal Submissions <data@fitzcap.co>",
        to: ["data@fitzcap.co"],
        subject: `New Submission: ${company_name} — ${industry}`,
        html: internalHtml,
      }),
    });

    if (!internalRes.ok) {
      const errText = await internalRes.text();
      console.error("Resend internal notification error:", internalRes.status, errText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-deal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
