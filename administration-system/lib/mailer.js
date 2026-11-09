const nodemailer = require("nodemailer");

// Hii NDIYO sehemu inayotuma EMAIL - inafanya kazi mara moja ukiweka
// SMTP_HOST / SMTP_USER / SMTP_PASS kwenye .env
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true kwa port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "Salon SaaS Platform";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

// Barua pepe ya "activation link" - inatumwa mara kampuni mpya inapoundwa.
// Hii ndiyo pekee inayohitajika sasa (badala ya "welcome email" ya zamani),
// kwa sababu mteja LAZIMA aweke password yake mwenyewe kabla ya kuingia
// (angalia sehemu 4 na 5 ya mahitaji: SEND ACTIVATION MESSAGE -> CUSTOMER
// ACTIVATES ACCOUNT -> ANAWEKA PASSWORD -> ANAINGIA).
function companyActivationEmail({ companyName, ownerName, username, activationUrl, planLabel, maxBranches }) {
  const planLine =
    planLabel && maxBranches !== undefined
      ? `<p>Kifurushi: <strong>${planLabel}</strong> (matawi hadi ${maxBranches === Infinity ? "bila kikomo" : maxBranches}).</p>`
      : "";
  return {
    subject: `Karibu ${companyName} - Wezesha Akaunti Yako`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Habari ${ownerName || ""},</h2>
        <p>Akaunti ya kampuni yako, <strong>${companyName}</strong>, imeundwa kwenye mfumo wetu wa saloon.</p>
        ${planLine}
        <p>Jina lako la mtumiaji (username): <strong>${username}</strong></p>
        <p>Bofya kiungo hapa chini ili uweke password yako na kuwezesha akaunti:</p>
        <p><a href="${activationUrl}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Wezesha Akaunti Yangu</a></p>
        <p style="color:#6b7280;font-size:12px;">Kiungo hiki kinaisha muda baada ya siku 5. Kama hukuomba akaunti hii, puuza barua pepe hii.</p>
        <p>Asante,<br/>Timu ya Usaidizi</p>
      </div>
    `,
  };
}

// Barua pepe ya kutaarifu kusimamishwa kwa huduma (subscription imeisha n.k.)
function companySuspendedEmail({ companyName, reason }) {
  return {
    subject: `Taarifa: Huduma ya ${companyName} imesimamishwa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Taarifa Muhimu</h2>
        <p>Huduma ya <strong>${companyName}</strong> imesimamishwa kwa sababu: <em>${reason || "muda wa subscription umeisha"}</em>.</p>
        <p>Tafadhali wasiliana nasi haraka ili kuendelea kutumia mfumo bila usumbufu.</p>
      </div>
    `,
  };
}

// Barua pepe ya kutaarifu kurejeshwa kwa huduma baada ya ACTIVATE.
function companyReactivatedEmail({ companyName }) {
  return {
    subject: `Huduma ya ${companyName} Imerejeshwa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Habari njema!</h2>
        <p>Huduma ya <strong>${companyName}</strong> imerejeshwa na sasa mnaweza kuendelea kutumia mfumo kama kawaida.</p>
        <p>Asante kwa uvumilivu wenu.</p>
      </div>
    `,
  };
}

// Ukumbusho wa subscription kukaribia kuisha (angalia README - reminders za kila siku).
function subscriptionExpiringEmail({ companyName, daysLeft, endDate }) {
  return {
    subject: `Ukumbusho: Subscription ya ${companyName} Inakaribia Kuisha`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
        <h2>Ukumbusho wa Subscription</h2>
        <p>Subscription ya <strong>${companyName}</strong> itaisha tarehe <strong>${new Date(endDate).toLocaleDateString()}</strong> (siku ${daysLeft} zilizobaki).</p>
        <p>Tafadhali fanya malipo kabla ya tarehe hiyo ili huduma isisitishwe.</p>
      </div>
    `,
  };
}

module.exports = {
  sendEmail,
  companyActivationEmail,
  companySuspendedEmail,
  companyReactivatedEmail,
  subscriptionExpiringEmail,
};
