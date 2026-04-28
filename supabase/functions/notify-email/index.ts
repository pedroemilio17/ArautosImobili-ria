// Supabase Edge Function: notify-email
// Handles email notifications when leads are created or follow-ups are scheduled.
//
// Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY - API key from resend.com (free: 100 emails/day)
//
// Deploy: npx supabase functions deploy notify-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "eng.luizotavio1@gmail.com";
const SITE_URL = "https://arautos-imobiliaria.vercel.app"; // Update with actual URL
const FROM_EMAIL = "onboarding@resend.dev"; // Use your verified domain: noreply@yourdomain.com

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { type, leadName, by, followUpDate } = await req.json();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 200, // Don't break the client
        headers: { "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let htmlBody = "";
    const dateStr = followUpDate
      ? new Date(followUpDate).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    if (type === "new_lead") {
      subject = `🏠 Novo Lead: ${leadName || "Sem nome"}`;
      htmlBody = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2d1f0e; margin-bottom: 8px;">Novo Lead Recebido</h2>
          <div style="background: #f8f5f0; border: 1px solid #e0d5c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Nome:</strong> ${leadName || "Sem nome"}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Acesse o CRM para ver os detalhes completos.</p>
          <a href="${SITE_URL}" style="display: inline-block; background: #2d1f0e; color: #f8f5f0; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 8px;">
            Abrir CRM Arautos
          </a>
        </div>
      `;
    } else if (type === "followup_scheduled") {
      subject = `📅 Follow-up Agendado: ${leadName || "Lead"}`;
      htmlBody = `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #2d1f0e; margin-bottom: 8px;">Follow-up Agendado</h2>
          <div style="background: #f8f5f0; border: 1px solid #e0d5c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Lead:</strong> ${leadName || "Sem nome"}</p>
            <p style="margin: 0 0 8px;"><strong>Follow-up em:</strong> ${dateStr}</p>
            <p style="margin: 0 0 0;"><strong>Marcado por:</strong> ${by || "—"}</p>
          </div>
          <p style="color: #666; font-size: 14px;">O lead foi marcado como contatado e um follow-up foi agendado automaticamente para daqui a 3 dias.</p>
          <a href="${SITE_URL}" style="display: inline-block; background: #2d1f0e; color: #f8f5f0; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 8px;">
            Abrir CRM Arautos
          </a>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: "Unknown notification type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send via Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject,
        html: htmlBody,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, // Always 200 to not break the client
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
