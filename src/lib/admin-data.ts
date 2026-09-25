import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { ensureWhatsappSettings, firestoreErrorMessage, isMissingIndexError } from "./firestore-init";
import type { Consultation } from "./consultations";

export type NotificationLog = {
  id: string;
  consultationId: string;
  recipient: string;
  type: string;
  message: string;
  status: "Pending" | "Sent" | "Failed" | "Not Configured";
  createdAt?: Timestamp;
  sentAt?: Timestamp | null;
  error?: string | null;
};

/**
 * Generic collection hook.
 *
 * Strategy for a fresh / empty Firestore:
 *  1. Try an ordered real-time listener (orderBy createdAt desc).
 *  2. If Firestore reports a missing index, fall back to a one-time
 *     unordered getDocs so the page is still usable while you create
 *     the index in the Firebase console.
 *  3. Surface a clear error message (with index-creation hint) instead
 *     of a silent empty state.
 */
export function useCollection<T>(name: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Attempt ordered real-time subscription
    const orderedQuery = query(
      collection(getFirebaseDb(), name),
      orderBy("createdAt", "desc"),
    );

    unsubscribe = onSnapshot(
      orderedQuery,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setError(null);
      },
      async (err) => {
        if (isMissingIndexError(err)) {
          // Index not yet created — fall back to unordered one-time read
          console.warn(
            `[admin-data] Missing Firestore index for "${name}". ` +
              "Falling back to unordered read. Check the console link above to create the index.",
            err,
          );
          try {
            const fallback = await getDocs(collection(getFirebaseDb(), name));
            setRows(
              fallback.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
            );
            setError(
              `⚠ Results are not sorted — a Firestore index is needed. ` +
                `Check the browser console for a link to create it, then refresh.`,
            );
          } catch (fallbackErr) {
            setError(firestoreErrorMessage(fallbackErr));
          }
        } else {
          setError(firestoreErrorMessage(err));
        }
      },
    );

    return () => unsubscribe?.();
  }, [name]);

  return { rows, error };
}

export const useConsultations = () =>
  useCollection<Consultation & { id: string }>("consultations");
export const useNotifications = () =>
  useCollection<NotificationLog>("notifications");

export type WhatsappSettings = {
  status: "Connected" | "Not Configured" | "Error";
  lastError?: string;
  updatedAt?: Timestamp;
};

/**
 * Subscribes to settings/whatsapp.
 * On a fresh database the document won't exist yet — this hook seeds it
 * automatically with defaults and then listens for real-time updates.
 */
export function useWhatsappSettings() {
  const [data, setData] = useState<WhatsappSettings | null>(null);

  useEffect(() => {
    // Seed the document if it's missing, then subscribe
    ensureWhatsappSettings().then(() => {
      const ref = doc(getFirebaseDb(), "settings", "whatsapp");
      const unsubscribe = onSnapshot(
        ref,
        (snap) => {
          setData(
            (snap.data() as WhatsappSettings | undefined) ?? {
              status: "Not Configured",
            },
          );
        },
        (err) => {
          console.error("[admin-data] settings/whatsapp listen failed:", err);
          // Still show a safe default rather than a blank screen
          setData({ status: "Not Configured" });
        },
      );
      return unsubscribe;
    });
  }, []);

  return data;
}

export const tsToString = (t?: Timestamp | null) =>
  t
    ? t
        .toDate()
        .toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
    : "—";
