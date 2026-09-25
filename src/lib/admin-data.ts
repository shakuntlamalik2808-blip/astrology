import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
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

export function useCollection<T>(name: string) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const q = query(collection(getFirebaseDb(), name), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
      (e) => setError(e.message),
    );
  }, [name]);
  return { rows, error };
}

export const useConsultations = () => useCollection<Consultation & { id: string }>("consultations");
export const useNotifications = () => useCollection<NotificationLog>("notifications");

export type WhatsappSettings = { status: "Connected" | "Not Configured" | "Error"; lastError?: string; updatedAt?: Timestamp };

export function useWhatsappSettings() {
  const [data, setData] = useState<WhatsappSettings | null>(null);
  useEffect(
    () =>
      onSnapshot(doc(getFirebaseDb(), "settings", "whatsapp"), (s) =>
        setData((s.data() as WhatsappSettings | undefined) ?? { status: "Not Configured" }),
      ),
    [],
  );
  return data;
}

export const tsToString = (t?: Timestamp | null) =>
  t ? t.toDate().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
