/**
 * firestore-init.ts
 *
 * Handles a fresh / empty Firestore database gracefully.
 *
 * Firestore collections do NOT need to be "created" — they spring into
 * existence the moment a document is written. However on a brand-new database:
 *
 *  1. `orderBy` queries on empty collections require a composite index that
 *     may not exist yet → they throw a "failed-precondition" error containing
 *     a link to create the index, or we can fall back to unordered reads.
 *  2. Singleton documents (e.g. settings/whatsapp) simply don't exist yet
 *     and must be created with safe defaults on first access.
 *
 * This module:
 *  - Seeds required singleton documents if they are missing.
 *  - Exports a helper to detect index-missing errors so callers can fall back.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

// ---------------------------------------------------------------------------
// Singleton seeds
// ---------------------------------------------------------------------------

/** Fields written the first time `settings/whatsapp` is accessed. */
const WHATSAPP_DEFAULTS = {
  status: "Not Configured",
  lastError: null,
  updatedAt: serverTimestamp(),
} as const;

/**
 * Ensures `settings/whatsapp` exists.
 * Safe to call multiple times — uses getDoc before writing.
 */
export async function ensureWhatsappSettings(): Promise<void> {
  try {
    const ref = doc(getFirebaseDb(), "settings", "whatsapp");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, WHATSAPP_DEFAULTS);
    }
  } catch (err) {
    // Log but never throw — UI should degrade gracefully
    console.warn("[firestore-init] Could not seed settings/whatsapp:", err);
  }
}

// ---------------------------------------------------------------------------
// Error classification helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a Firestore error is caused by a missing index.
 * Firestore throws "failed-precondition" and embeds a console link to
 * create the index.
 */
export function isMissingIndexError(err: unknown): boolean {
  const msg =
    (err as { message?: string })?.message ??
    (err as { code?: string })?.code ??
    String(err);
  return (
    msg.includes("failed-precondition") ||
    msg.includes("requires an index") ||
    msg.includes("The query requires an index")
  );
}

/**
 * Returns true when a Firestore error is a permission-denied.
 * Happens when Firestore rules block the read (e.g. user not signed in yet).
 */
export function isPermissionError(err: unknown): boolean {
  const msg =
    (err as { code?: string })?.code ??
    (err as { message?: string })?.message ??
    String(err);
  return msg.includes("permission-denied") || msg.includes("PERMISSION_DENIED");
}

/**
 * Human-readable message for common Firestore errors on a fresh database.
 */
export function firestoreErrorMessage(err: unknown): string {
  if (isMissingIndexError(err)) {
    return (
      "A Firestore index is required for this query. " +
      "Check the browser console for a link to create it, then refresh."
    );
  }
  if (isPermissionError(err)) {
    return "Permission denied. Make sure you are signed in as an admin.";
  }
  return (err as Error)?.message ?? "An unexpected database error occurred.";
}
