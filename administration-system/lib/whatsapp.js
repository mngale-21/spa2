// ==========================================================
// WHATSAPP - HIARI (SI LAZIMA KUWEZESHA MARA MOJA)
// Soma README.md sehemu ya "WHATSAPP" kwa maelekezo kamili.
// Hapa tumetumia njia ya TWILIO (rahisi zaidi kuanzia nayo).
// ==========================================================

async function sendWhatsAppMessage({ to, message }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !authToken || !from) {
    console.warn(
      "[WhatsApp] Twilio haijawekwa (.env). Ujumbe huu haukutumwa. " +
      "Angalia README.md sehemu ya WhatsApp kwa maelekezo."
    );
    return { skipped: true };
  }

  // Twilio SDK: npm install twilio
  const twilio = require("twilio")(sid, authToken);

  return twilio.messages.create({
    from, // mf. "whatsapp:+14155238886"
    to: `whatsapp:${to}`, // mf. "whatsapp:+255700000000"
    body: message,
  });
}

module.exports = { sendWhatsAppMessage };
