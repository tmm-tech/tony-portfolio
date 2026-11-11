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

  const from = process.env.FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";
  const textBody = [
    "New portfolio enquiry",
    "",
    "Name: " + safeName,
    "Email: " + safeEmail,
    "Subject: " + safeSubject,
    "",
    safeMessage
  ].join("\n");

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
        text: textBody
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
