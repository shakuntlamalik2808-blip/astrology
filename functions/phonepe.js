const crypto = require("crypto");
const { defineSecret, defineString } = require("firebase-functions/params");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");

const db = getFirestore();
const PHONEPE_CLIENT_ID = defineSecret("PHONEPE_CLIENT_ID");
const PHONEPE_CLIENT_SECRET = defineSecret("PHONEPE_CLIENT_SECRET");
const PHONEPE_CLIENT_VERSION = defineString("PHONEPE_CLIENT_VERSION", { default: "1" });
const PHONEPE_ENV = defineString("PHONEPE_ENV", { default: "SANDBOX" });
const PHONEPE_BASE_URL = defineString("PHONEPE_BASE_URL", { default: "" });
const PHONEPE_MERCHANT_ID = defineString("PHONEPE_MERCHANT_ID", { default: "" });
const PUBLIC_APP_URL = defineString("PUBLIC_APP_URL", { default: "https://starsandsutra.com" });

const phonePeSecrets = [PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET];
let cachedToken = "";
let tokenExpiresAt = 0;

function environmentConfig() {
  const environment = PHONEPE_ENV.value().trim().toUpperCase();
  if (environment !== "SANDBOX" && environment !== "PRODUCTION") {
    throw new HttpsError("failed-precondition", "PHONEPE_ENV must be SANDBOX or PRODUCTION.");
  }
  const expectedBase = environment === "SANDBOX"
    ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
    : "https://api.phonepe.com/apis/pg";
  const configuredBase = PHONEPE_BASE_URL.value().trim().replace(/\/$/, "");
  if (configuredBase && configuredBase !== expectedBase) {
    throw new HttpsError("failed-precondition", "PHONEPE_BASE_URL must match the selected PhonePe environment.");
  }
  return {
    environment,
    baseUrl: expectedBase,
    tokenUrl: environment === "SANDBOX"
      ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
      : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
  };
}

async function getPhonePeToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 90) return cachedToken;
  const { tokenUrl } = environmentConfig();
  const body = new URLSearchParams({
    client_id: PHONEPE_CLIENT_ID.value(),
    client_version: PHONEPE_CLIENT_VERSION.value().trim(),
    client_secret: PHONEPE_CLIENT_SECRET.value(),
    grant_type: "client_credentials",
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    console.error("PhonePe OAuth token request failed", { status: response.status, code: payload.code });
    throw new HttpsError("unavailable", "PhonePe could not start a secure payment session. Please try again.");
  }
  cachedToken = payload.access_token;
  tokenExpiresAt = Number(payload.expires_at) || now + 3000;
  return cachedToken;
}

function phonePeHeaders(token) {
  const headers = {
    Authorization: `O-Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const merchantId = PHONEPE_MERCHANT_ID.value().trim();
  if (merchantId) headers["X-MERCHANT-ID"] = merchantId;
  return headers;
}

function getConfiguredAmountPaise(settings, consultationType) {
  const service = (Array.isArray(settings.services) ? settings.services : [])
    .find((item) => item && item.name === consultationType);
  if (!service || typeof service.price !== "string") {
    throw new HttpsError("failed-precondition", "This consultation does not have a payment price configured yet.");
  }
  const match = service.price.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
  if (!match) throw new HttpsError("failed-precondition", "Set a numeric price for this consultation in General Settings.");
  const rupees = Number(match[0]);
  const amountPaise = Math.round(rupees * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    throw new HttpsError("failed-precondition", "The consultation price must be at least ₹1.");
  }
  return amountPaise;
}

function validateBooking(data) {
  const fields = ["fullName", "whatsappNumber", "email", "dateOfBirth", "timeOfBirth", "placeOfBirth", "consultationType", "preferredDate", "preferredTime", "memberId", "memberName", "relationship", "bookedByName", "additionalMessage"];
  if (!data || typeof data !== "object" || fields.some((field) => typeof data[field] !== "string")) {
    throw new HttpsError("invalid-argument", "Complete the consultation form before continuing to payment.");
  }
  if (data.fullName.trim().length < 2 || data.fullName.length > 100 || data.memberName.trim().length < 2 || data.memberName.length > 100) {
    throw new HttpsError("invalid-argument", "Enter a valid name for the customer and consultation member.");
  }
  if (!/^\+[0-9]{7,18}$/.test(data.whatsappNumber)) throw new HttpsError("invalid-argument", "Enter a valid phone number.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) || data.email.length > 254) throw new HttpsError("invalid-argument", "Enter a valid email address.");
  const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!isDate(data.dateOfBirth) || !isDate(data.preferredDate) || data.dateOfBirth > new Date().toISOString().slice(0, 10)) {
    throw new HttpsError("invalid-argument", "Enter valid birth and appointment dates.");
  }
  const timeParts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(data.preferredTime);
  if (!timeParts || data.placeOfBirth.trim().length < 2 || data.placeOfBirth.length > 120 || data.bookedByName.trim().length < 2 || data.bookedByName.length > 100) {
    throw new HttpsError("invalid-argument", "Enter valid appointment time and place of birth.");
  }
  if (!data.consultationType.trim() || data.consultationType.length > 100 || !data.memberId.trim() || data.memberId.length > 100 || data.additionalMessage.length > 1500) {
    throw new HttpsError("invalid-argument", "Some consultation details are missing or too long.");
  }
  if (!["Self", "Spouse", "Child", "Parent", "Friend", "Other"].includes(data.relationship)) {
    throw new HttpsError("invalid-argument", "Choose a valid relationship for the consultation member.");
  }
  if (data.preferredDate < new Date().toISOString().slice(0, 10)) throw new HttpsError("invalid-argument", "Choose an appointment date from today onwards.");
  return Object.fromEntries(fields.map((field) => [field, data[field].trim()]));
}

function birthdayValidity(dateOfBirth, appointmentDate) {
  const [, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, appointmentMonth, appointmentDay] = appointmentDate.split("-").map(Number);
  const appointmentUtc = Date.UTC(year, appointmentMonth - 1, appointmentDay);
  let birthdayUtc = Date.UTC(year, birthMonth - 1, birthDay);
  if (birthdayUtc <= appointmentUtc) birthdayUtc = Date.UTC(year + 1, birthMonth - 1, birthDay);
  return {
    validFrom: appointmentDate,
    validUntil: new Date(birthdayUtc).toISOString().slice(0, 10),
  };
}

function dateInIndia(timestamp) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(timestamp.toDate());
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function makeMerchantOrderId() {
  return `SS-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
}

function getRedirectUrl(merchantOrderId) {
  let base;
  try {
    base = new URL(PUBLIC_APP_URL.value().trim());
  } catch {
    throw new HttpsError("failed-precondition", "PUBLIC_APP_URL must be a valid HTTPS URL.");
  }
  if (base.protocol !== "https:" && base.hostname !== "localhost") {
    throw new HttpsError("failed-precondition", "PUBLIC_APP_URL must use HTTPS.");
  }
  const url = new URL("/payment/return", base);
  url.searchParams.set("merchantOrderId", merchantOrderId);
  return url.toString();
}

async function phonePeOrderStatus(merchantOrderId) {
  const { baseUrl } = environmentConfig();
  const token = await getPhonePeToken();
  const url = new URL(`${baseUrl}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`);
  url.searchParams.set("details", "true");
  const response = await fetch(url, {
    headers: phonePeHeaders(token),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("PhonePe order status request failed", { status: response.status, merchantOrderId, code: payload.code });
    throw new HttpsError("unavailable", "Payment status is temporarily unavailable. Please check again shortly.");
  }
  return payload;
}

async function finalizeVerifiedOrder(merchantOrderId, providerStatus) {
  const orderRef = db.collection("phonePePayments").doc(merchantOrderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) throw new HttpsError("not-found", "Payment order was not found.");
  const order = orderSnapshot.data();
  if (order.state === "CONFIRMED") return { state: "CONFIRMED", consultationId: order.consultationId };
  if (providerStatus.state !== "COMPLETED") {
    if (providerStatus.state === "FAILED" || providerStatus.state === "EXPIRED") {
      const reservationRef = db.collection("slotReservations").doc(order.slotId);
      await db.runTransaction(async (transaction) => {
        const [latestOrder, reservation] = await Promise.all([transaction.get(orderRef), transaction.get(reservationRef)]);
        if (latestOrder.exists && latestOrder.data().state !== "CONFIRMED") {
          transaction.update(orderRef, { state: providerStatus.state, providerState: providerStatus.state, updatedAt: FieldValue.serverTimestamp() });
          if (reservation.exists && reservation.data().merchantOrderId === merchantOrderId) transaction.delete(reservationRef);
        }
      });
      return { state: providerStatus.state };
    }
    await orderRef.update({ providerState: providerStatus.state || "PENDING", updatedAt: FieldValue.serverTimestamp() });
    return { state: "PENDING" };
  }

  const amountPaise = Number(providerStatus.amount);
  if (!Number.isSafeInteger(amountPaise) || amountPaise !== order.amountPaise) {
    await orderRef.update({ state: "REVIEW_REQUIRED", providerState: providerStatus.state, updatedAt: FieldValue.serverTimestamp() });
    await db.collection("notifications").add({
      type: "payment_review",
      status: "Review required",
      recipient: order.userEmail,
      merchantOrderId,
      consultationId: order.consultationId,
      message: "PhonePe reported a completed payment with an unexpected amount.",
      createdAt: FieldValue.serverTimestamp(),
    });
    return { state: "REVIEW_REQUIRED" };
  }

  const reservationRef = db.collection("slotReservations").doc(order.slotId);
  const availabilityRef = db.collection("availableSlots").doc(order.slotId);
  const bookedRef = db.collection("bookedSlots").doc(order.slotId);
  const consultationRef = db.collection("consultations").doc(order.consultationId);
  const paymentDetails = Array.isArray(providerStatus.paymentDetails) ? providerStatus.paymentDetails : [];
  const completedPayment = [...paymentDetails].reverse().find((item) => item.state === "COMPLETED") || {};
  const transactionId = typeof completedPayment.transactionId === "string" ? completedPayment.transactionId : "";
  const paymentTimestamp = Number(completedPayment.timestamp);
  const paidAt = Number.isFinite(paymentTimestamp) ? Timestamp.fromMillis(paymentTimestamp) : Timestamp.now();
  let conflict = false;

  await db.runTransaction(async (transaction) => {
    const [latestOrder, availability, booked, reservation, consultation] = await Promise.all([
      transaction.get(orderRef), transaction.get(availabilityRef), transaction.get(bookedRef),
      transaction.get(reservationRef), transaction.get(consultationRef),
    ]);
    if (!latestOrder.exists) throw new HttpsError("not-found", "Payment order was not found.");
    if (latestOrder.data().state === "CONFIRMED") return;
    if (latestOrder.data().state === "PAID_SLOT_CONFLICT") { conflict = true; return; }
    const reservationIsOurs = reservation.exists && reservation.data().merchantOrderId === merchantOrderId;
    const reservationIsActive = reservation.exists && reservation.data().expiresAt?.toMillis?.() > Date.now();
    if (consultation.exists && consultation.data().phonePeMerchantOrderId === merchantOrderId) {
      transaction.update(orderRef, { state: "CONFIRMED", providerState: "COMPLETED", phonePeTransactionId: transactionId, paidAt, updatedAt: FieldValue.serverTimestamp() });
      if (reservationIsOurs) transaction.delete(reservationRef);
      return;
    }
    if (!availability.exists || availability.data().enabled !== true || booked.exists || consultation.exists || (reservationIsActive && !reservationIsOurs)) {
      conflict = true;
      const conflictValidity = birthdayValidity(order.booking.dateOfBirth, order.booking.preferredDate);
      if (!consultation.exists) transaction.create(consultationRef, {
        ...order.booking,
        consultationId: order.consultationId,
        userId: order.uid,
        customerId: order.uid,
        ...conflictValidity,
        source: "phonepe-conflict",
        status: "Payment Review",
        paymentStatus: "Paid",
        paymentAmount: amountPaise / 100,
        paidAmount: amountPaise / 100,
        paymentAmountPaise: amountPaise,
        paymentMethod: "PhonePe",
        paymentReference: transactionId || merchantOrderId,
        paymentDate: dateInIndia(paidAt),
        phonePeMerchantOrderId: merchantOrderId,
        phonePeTransactionId: transactionId,
        paidAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(orderRef, {
        state: "PAID_SLOT_CONFLICT",
        providerState: "COMPLETED",
        phonePeTransactionId: transactionId,
        paidAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(db.collection("notifications").doc(`phonepe-conflict-${merchantOrderId}`), {
        type: "payment_review",
        status: "Review required",
        recipient: latestOrder.data().userEmail,
        merchantOrderId,
        consultationId: order.consultationId,
        message: "Payment completed after the consultation time was no longer available. Contact the customer to reschedule or refund.",
        createdAt: FieldValue.serverTimestamp(),
      });
      if (reservationIsOurs) transaction.delete(reservationRef);
      return;
    }
    const validity = birthdayValidity(order.booking.dateOfBirth, order.booking.preferredDate);
    transaction.create(consultationRef, {
      ...order.booking,
      consultationId: order.consultationId,
      userId: order.uid,
      customerId: order.uid,
      ...validity,
      source: "website",
      status: "Confirmed",
      paymentStatus: "Paid",
      paymentAmount: amountPaise / 100,
      paidAmount: amountPaise / 100,
      paymentAmountPaise: amountPaise,
      paymentMethod: "PhonePe",
      paymentReference: transactionId || merchantOrderId,
      paymentDate: dateInIndia(paidAt),
      phonePeMerchantOrderId: merchantOrderId,
      phonePeTransactionId: transactionId,
      paidAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(bookedRef, {
      date: order.booking.preferredDate,
      time: order.booking.preferredTime,
      consultationId: order.consultationId,
      merchantOrderId,
    });
    transaction.update(orderRef, {
      state: "CONFIRMED",
      providerState: "COMPLETED",
      phonePeTransactionId: transactionId,
      paidAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (reservationIsOurs) transaction.delete(reservationRef);
  });

  return conflict
    ? { state: "PAID_SLOT_CONFLICT", consultationId: order.consultationId }
    : { state: "CONFIRMED", consultationId: order.consultationId };
}

async function verifyAndFinalize(merchantOrderId) {
  const paymentRef = db.collection("phonePePayments").doc(merchantOrderId);
  const payment = await paymentRef.get();
  if (!payment.exists) throw new HttpsError("not-found", "Payment order was not found.");
  if (payment.data().state === "CONFIRMED") return { state: "CONFIRMED", consultationId: payment.data().consultationId };
  if (payment.data().state === "PAID_SLOT_CONFLICT") return { state: "PAID_SLOT_CONFLICT", consultationId: payment.data().consultationId };
  const status = await phonePeOrderStatus(merchantOrderId);
  return finalizeVerifiedOrder(merchantOrderId, status);
}

exports.createPhonePeOrder = onCall({ region: "asia-south1", cors: true, secrets: phonePeSecrets, timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before booking a consultation.");
  const booking = validateBooking(request.data?.booking);
  const settingsSnapshot = await db.collection("settings").doc("website").get();
  const amountPaise = getConfiguredAmountPaise(settingsSnapshot.data() || {}, booking.consultationType);
  const slotId = `${booking.preferredDate}_${booking.preferredTime}`;
  const merchantOrderId = makeMerchantOrderId();
  const consultationId = `SS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const paymentRef = db.collection("phonePePayments").doc(merchantOrderId);
  const reservationRef = db.collection("slotReservations").doc(slotId);
  const availabilityRef = db.collection("availableSlots").doc(slotId);
  const bookedRef = db.collection("bookedSlots").doc(slotId);
  const expiresAt = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000);

  await db.runTransaction(async (transaction) => {
    const [availability, booked, reservation] = await Promise.all([
      transaction.get(availabilityRef), transaction.get(bookedRef), transaction.get(reservationRef),
    ]);
    if (!availability.exists || availability.data().enabled !== true) throw new HttpsError("failed-precondition", "That appointment time is not available.");
    if (booked.exists) throw new HttpsError("already-exists", "That appointment time has just been booked. Please select another.");
    const activeReservation = reservation.exists && reservation.data().expiresAt?.toMillis?.() > Date.now();
    if (activeReservation) throw new HttpsError("already-exists", "Someone is completing payment for that time. Please choose another slot or try again shortly.");
    transaction.set(paymentRef, {
      merchantOrderId,
      consultationId,
      uid: request.auth.uid,
      userEmail: request.auth.token.email || booking.email,
      slotId,
      booking,
      amountPaise,
      state: "CREATING",
      providerState: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(reservationRef, { merchantOrderId, uid: request.auth.uid, expiresAt, createdAt: FieldValue.serverTimestamp() });
  });

  try {
    const { baseUrl } = environmentConfig();
    const token = await getPhonePeToken();
    const redirectUrl = getRedirectUrl(merchantOrderId);
    const response = await fetch(`${baseUrl}/checkout/v2/pay`, {
      method: "POST",
      headers: phonePeHeaders(token),
      body: JSON.stringify({
        merchantOrderId,
        amount: amountPaise,
        expireAfter: 1200,
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `Consultation booking for ${booking.memberName}`,
          merchantUrls: { redirectUrl },
        },
        metaInfo: { udf1: consultationId, udf2: request.auth.uid },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.redirectUrl !== "string") {
      console.error("PhonePe create payment failed", { status: response.status, code: result.code, merchantOrderId });
      throw new Error("PhonePe did not create a checkout session.");
    }
    await paymentRef.update({ state: "PENDING", phonePeOrderId: result.orderId || "", redirectUrl: result.redirectUrl, updatedAt: FieldValue.serverTimestamp() });
    return { merchantOrderId, consultationId, amountPaise, redirectUrl: result.redirectUrl };
  } catch (error) {
    await db.runTransaction(async (transaction) => {
      const reservation = await transaction.get(reservationRef);
      transaction.update(paymentRef, { state: "CREATE_FAILED", updatedAt: FieldValue.serverTimestamp() });
      if (reservation.exists && reservation.data().merchantOrderId === merchantOrderId) transaction.delete(reservationRef);
    }).catch((transactionError) => console.error("Could not release PhonePe slot reservation", transactionError));
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", "PhonePe checkout could not be started. Please try again.");
  }
});
exports.verifyPhonePePayment = onCall({ region: "asia-south1", cors: true, secrets: phonePeSecrets, timeoutSeconds: 60 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to verify this payment.");
  const merchantOrderId = request.data?.merchantOrderId;
  if (typeof merchantOrderId !== "string" || !/^SS-[0-9]+-[a-f0-9]{12}$/.test(merchantOrderId)) {
    throw new HttpsError("invalid-argument", "A valid payment order ID is required.");
  }
  const payment = await db.collection("phonePePayments").doc(merchantOrderId).get();
  if (!payment.exists || payment.data().uid !== request.auth.uid) throw new HttpsError("permission-denied", "This payment does not belong to your account.");
  return verifyAndFinalize(merchantOrderId);
});
