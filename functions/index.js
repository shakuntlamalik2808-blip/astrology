// Firebase Cloud Function: runs when a consultation is created from the website.
// 1) links/creates the customer  2) logs an admin notification  3) sends WhatsApp (if configured)
// Deploy: cd functions && npm install && firebase deploy --only functions,firestore:rules
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const fs = require("fs");

initializeApp();
const db = getFirestore();

const WHATSAPP_API_TOKEN = defineSecret("WHATSAPP_API_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = defineSecret("WHATSAPP_PHONE_NUMBER_ID");
const ADMIN_NUMBER = "919811840795";
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const REMEDY_EMAIL_FROM = defineString("REMEDY_EMAIL_FROM");

async function assertAdmin(request) {
  const email = request.auth?.token?.email;
  if (!email || request.auth.token.email_verified !== true) throw new HttpsError("permission-denied", "Admin access is required.");
  const admins = await db.doc("settings/admins").get();
  const allowlist = admins.data()?.emails;
  if (!Array.isArray(allowlist) || !allowlist.some((item) => typeof item === "string" && item.toLowerCase() === email.toLowerCase())) {
    throw new HttpsError("permission-denied", "Admin access is required.");
  }
}

exports.translateRemedies = onCall({ region: "asia-south1", secrets: [GEMINI_API_KEY] }, async (request) => {
  await assertAdmin(request);
  const id = request.data?.consultationId;
  if (typeof id !== "string") throw new HttpsError("invalid-argument", "Consultation ID is required.");
  const consultation = await db.collection("consultations").doc(id).get();
  const hindi = consultation.data()?.remediesHindi;
  if (!consultation.exists || typeof hindi !== "string" || !hindi.trim()) throw new HttpsError("failed-precondition", "Save Hindi remedies before translating.");
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Translate and format the following Hindi astrological remedies into clear, warm, counseling-led English. Preserve the meaning and exact wording of mantras, gemstone names, Rudraksha, and daan items. Do not add remedies or make guarantees. Return only the edited English draft.\n\n${hindi}` }] }] }),
  });
  if (!response.ok) throw new HttpsError("internal", `Translation service returned ${response.status}.`);
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new HttpsError("internal", "Translation service returned an empty draft.");
  await consultation.ref.update({ remediesEnglish: text, updatedAt: FieldValue.serverTimestamp() });
  return { text };
});

async function renderRemedyPdf(c, language, text) {
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const hindiFont = fs.readFileSync(require.resolve("@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-400-normal.woff")).toString("base64");
  const latinFont = fs.readFileSync(require.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff")).toString("base64");
  const birth = [c.dateOfBirth, c.timeOfBirth, c.placeOfBirth].filter(Boolean).join(" · ");
  const body = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  const html = `<!doctype html><html lang="${language === "Hindi" ? "hi" : "en"}"><meta charset="utf-8"><style>
    @font-face{font-family:Remedy;src:url(data:font/woff;base64,${latinFont}) format('woff');unicode-range:U+0000-024F}
    @font-face{font-family:Remedy;src:url(data:font/woff;base64,${hindiFont}) format('woff');unicode-range:U+0900-097F,U+1CD0-1CFF,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A83F,U+A8E0-A8FF,U+11B00-11B09}
    @page{size:A4;margin:20mm}body{font-family:Remedy,sans-serif;color:#202633;font-size:11pt;line-height:1.75}.brand{font-size:9pt;letter-spacing:2px;text-transform:uppercase;color:#9a7937;border-bottom:1px solid #c9ad70;padding-bottom:12px}.title{font-size:22pt;font-weight:500;margin:28px 0 20px}.meta{border-block:1px solid #ddd;padding:14px 0;line-height:2}.label{font-weight:600}.remedies{margin-top:28px;line-height:2;padding-left:1.5em}.remedies li{padding:0 0 8px 6px}.remedies li::marker{color:#9a7937}.footer{margin-top:42px;padding-top:14px;border-top:1px solid #ddd;color:#777;font-size:9pt}
  </style><main><div class="brand">Shakuntla Malik · Jyotish, Counseling & Astrology Academy</div><h1 class="title">${language === "Hindi" ? "ज्योतिषीय उपाय एवं मार्गदर्शन" : "Remedies & Guidance"}</h1><div class="meta"><div><span class="label">Reference:</span> ${escapeHtml(c.consultationId)}</div><div><span class="label">Client:</span> ${escapeHtml(c.fullName)}</div><div><span class="label">Consultation date:</span> ${escapeHtml(c.preferredDate)}</div><div><span class="label">Birth details:</span> ${escapeHtml(birth)}</div></div><ol class="remedies">${body}</ol><div class="footer">Prepared with care by Shakuntla Malik</div></main></html>`;
  const browser = await puppeteer.launch({ args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: await chromium.executablePath(), headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  } finally {
    await browser.close();
  }
}

exports.sendRemedyEmail = onCall({ region: "asia-south1", memory: "1GiB", timeoutSeconds: 60, secrets: [RESEND_API_KEY] }, async (request) => {
  await assertAdmin(request);
  const id = request.data?.consultationId;
  if (typeof id !== "string") throw new HttpsError("invalid-argument", "Consultation ID is required.");
  const ref = db.collection("consultations").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Consultation was not found.");
  const c = snap.data();
  const language = c.remedyLanguage === "English" ? "English" : "Hindi";
  const text = language === "English" ? c.remediesEnglish : c.remediesHindi;
  if (!c.email || typeof text !== "string" || !text.trim()) throw new HttpsError("failed-precondition", "A customer email and saved remedies are required.");
  const notification = db.collection("notifications").doc();
  const base = { notificationId: notification.id, consultationId: c.consultationId, recipient: c.email, type: "email", message: `Remedies PDF (${language})`, createdAt: FieldValue.serverTimestamp() };
  await notification.set({ ...base, status: "Pending", error: null });
  try {
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const pdf = await renderRemedyPdf(c, language, text);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: REMEDY_EMAIL_FROM.value(), to: [c.email], subject: `Your remedies and guidance · ${c.consultationId}`, html: `<p>Dear ${String(c.fullName).replace(/[<>]/g, "")},</p><p>Please find your remedies and guidance attached. You may keep this document for reference.</p><p>Warm regards,<br>Shakuntla Malik</p>`, attachments: [{ filename: `remedies-${c.consultationId}.pdf`, content: pdf.toString("base64") }] }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
    await Promise.all([
      notification.update({ status: "Sent", sentAt: FieldValue.serverTimestamp() }),
      ref.update({ remediesSentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }),
    ]);
    return { sent: true };
  } catch (error) {
    await notification.update({ status: "Failed", error: String(error.message || error).slice(0, 500) });
    throw new HttpsError("internal", "Remedies email could not be sent. Check the email configuration and retry.");
  }
});

function buildMessage(c) {
  return [
    c.source === "admin" ? "New Manual Consultation" : "New Website Consultation Request",
    "",
    `Name: ${c.fullName}`,
    `WhatsApp: ${c.whatsappNumber}`,
    `Email: ${c.email}`,
    `Date of Birth: ${c.dateOfBirth}`,
    `Time of Birth: ${c.timeOfBirth || "Not provided"}`,
    `Place of Birth: ${c.placeOfBirth}`,
    `Current City: ${c.currentCity}`,
    `Consultation Type: ${c.consultationType}`,
    `Preferred Date: ${c.preferredDate}`,
    `Preferred Time: ${c.preferredTime}`,
    "",
    "Message:",
    c.additionalMessage || "—",
    "",
    `Source: ${c.source === "admin" ? "Admin" : "Website"}`,
    `Status: ${c.status || "New"}`,
    `Reference: ${c.consultationId}`,
  ].join("\n");
}

async function upsertCustomer(c) {
  const byPhone = await db.collection("customers").where("whatsappNumber", "==", c.whatsappNumber).limit(1).get();
  const found = byPhone.empty
    ? await db.collection("customers").where("email", "==", c.email).limit(1).get()
    : byPhone;
  if (!found.empty) {
    const ref = found.docs[0].ref;
    await ref.update({ consultationIds: FieldValue.arrayUnion(c.consultationId), updatedAt: FieldValue.serverTimestamp() });
    return ref.id;
  }
  const ref = await db.collection("customers").add({
    fullName: c.fullName,
    whatsappNumber: c.whatsappNumber,
    email: c.email,
    dateOfBirth: c.dateOfBirth,
    timeOfBirth: c.timeOfBirth || "",
    placeOfBirth: c.placeOfBirth,
    currentCity: c.currentCity,
    source: c.source || "website",
    consultationIds: [c.consultationId],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

exports.onConsultationCreated = onDocumentCreated(
  { document: "consultations/{id}", region: "asia-south1", secrets: [WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (event) => {
    const c = event.data?.data();
    if (!c) return;

    try {
      const customerId = await upsertCustomer(c);
      await event.data.ref.update({ customerId });
    } catch (e) {
      console.error("customer upsert failed", e);
    }

    // Manual entries are already visible to the owner who created them.
    if (c.source === "admin") return;

    const message = buildMessage(c);
    const notifRef = db.collection("notifications").doc();
    const base = {
      notificationId: notifRef.id,
      consultationId: c.consultationId,
      recipient: `+${ADMIN_NUMBER}`,
      type: "ADMIN_CONSULTATION_NOTIFICATION",
      message,
      createdAt: FieldValue.serverTimestamp(),
      sentAt: null,
      error: null,
    };

    const token = WHATSAPP_API_TOKEN.value();
    const phoneId = WHATSAPP_PHONE_NUMBER_ID.value();
    const settings = db.collection("settings").doc("whatsapp");

    if (!token || !phoneId) {
      await notifRef.set({ ...base, status: "Not Configured" });
      await settings.set({ status: "Not Configured", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }

    await notifRef.set({ ...base, status: "Pending" });
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: ADMIN_NUMBER, type: "text", text: { body: message } }),
      });
      if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
      await notifRef.update({ status: "Sent", sentAt: FieldValue.serverTimestamp() });
      await settings.set({ status: "Connected", lastError: "", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) {
      const msg = String(e.message || e).slice(0, 500);
      await notifRef.update({ status: "Failed", error: msg });
      await settings.set({ status: "Error", lastError: msg, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  },
);
