// Vercel serverless function: POST /api/contact
// Required environment variables: RESEND_API_KEY, TO_EMAIL
// Optional: FROM_EMAIL (must be a verified sender in Resend).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { name, email, subject, message, website } = req.body || {};

  // Quietly accept honeypot submissions so bots do not learn the check.
  if (typeof website === "string" && website.trim()) {
    return res.status(200).json({ ok: true });
  }

  const clean = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const safeName = clean(name, 100);
  const safeEmail = clean(email, 254);
  const safeSubject = clean(subject, 150);
  const safeMessage = clean(message, 5000);

  if (!safeName || !safeEmail || !EMAIL_RE.test(safeEmail) ||
      !safeSubject || safeMessage.length < 10) {
    return res.status(400).json({ error: "Please provide a valid name, email, subject and message (at least 10 characters)." });
  }
  if (!process.env.RESEND_API_KEY || !process.env.TO_EMAIL) {
    console.error("Contact form is missing RESEND_API_KEY or TO_EMAIL.");
    return res.status(503).json({ error: "The contact form is not configured yet. Please try again later." });
  }

  // Escape all visitor-provided values before inserting them into the HTML email.
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const htmlMessage = escapeHtml(safeMessage).replace(/\r?\n/g, "<br>");
  const replyUrl = "mailto:" + encodeURIComponent(safeEmail);

  const from = process.env.FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const textBody = [
    "NEW PORTFOLIO ENQUIRY",
    "",
    "Name: " + safeName,
    "Email: " + safeEmail,
    "Subject: " + safeSubject,
    "",
    "MESSAGE",
    safeMessage,
    "",
    "Reply directly to this email to respond to " + safeName + "."
  ].join("\n");

  const htmlBody = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>New portfolio enquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e5e9f0;border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px;background-color:#0b1222;color:#ffffff;">
            <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#a8b5cc;">TONY MWANGI MUGI · PORTFOLIO</div>
            <div style="font-size:25px;line-height:32px;font-weight:700;margin-top:12px;">A new message has arrived.</div>
            <div style="font-size:14px;line-height:21px;color:#c2ccdc;margin-top:7px;">Someone has contacted you through your portfolio website.</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 10px;">
            <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#66738a;text-transform:uppercase;">Enquiry details</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;">
              <tr>
                <td width="110" style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:13px;color:#778197;">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:14px;font-weight:600;color:#172033;">${escapeHtml(safeName)}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:13px;color:#778197;">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:14px;color:#2457b2;"><a href="${replyUrl}" style="color:#2457b2;text-decoration:none;">${escapeHtml(safeEmail)}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:13px;color:#778197;">Subject</td>
                <td style="padding:10px 0;border-bottom:1px solid #edf0f4;font-size:14px;font-weight:600;color:#172033;">${escapeHtml(safeSubject)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 30px;">
            <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#66738a;text-transform:uppercase;margin-bottom:12px;">Message</div>
            <div style="padding:18px 20px;background-color:#f6f8fb;border:1px solid #e8edf4;border-radius:9px;font-size:14px;line-height:23px;color:#263248;overflow-wrap:anywhere;">${htmlMessage}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
              <tr><td bgcolor="#2457b2" style="border-radius:7px;">
                <a href="${replyUrl}" style="display:inline-block;padding:12px 19px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">Reply to enquiry</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px;background-color:#f8f9fc;border-top:1px solid #edf0f4;">
            <div style="font-size:11px;line-height:18px;color:#8993a5;">This notification was sent from the contact form at your portfolio website.</div>
            <div style="font-size:11px;line-height:18px;color:#8993a5;">TONY MWANGI MUGI · NAIROBI, KENYA</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [process.env.TO_EMAIL],
        reply_to: safeEmail,
        subject: "[Portfolio] " + safeSubject,
        text: textBody,
        html: htmlBody
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend delivery failed:", response.status, detail.slice(0, 500));
      return res.status(502).json({ error: "Email delivery failed. Please try again later." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Contact email request failed:", error);
    return res.status(502).json({ error: "Email delivery failed. Please try again later." });
  }
};
