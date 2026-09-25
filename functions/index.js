// Firebase Cloud Function: runs when a consultation is created from the website.
// 1) links/creates the customer  2) logs an admin notification  3) sends WhatsApp (if configured)
// Deploy: cd functions && npm install && firebase deploy --only functions,firestore:rules
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const WHATSAPP_API_TOKEN = defineSecret("WHATSAPP_API_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = defineSecret("WHATSAPP_PHONE_NUMBER_ID");
const ADMIN_NUMBER = "919811840795";

function buildMessage(c) {
  return [
    "New Website Consultation Request",
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
    "Source: Website",
    "Status: New",
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
    source: "website",
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
