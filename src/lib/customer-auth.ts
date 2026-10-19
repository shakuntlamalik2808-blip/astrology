import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "./firebase";

export type CustomerProfile = {
  uid: string; name: string; email: string; phone: string;
  birthDetails: { dateOfBirth: string; timeOfBirth: string; placeOfBirth: string; currentCity: string };
};

export function useCustomerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isFirebaseConfigured()) { setLoading(false); return; }
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(getFirebaseAuth(), (next) => {
      stopProfile?.();
      stopProfile = undefined;
      setUser(next);
      if (!next) { setName(""); setLoading(false); return; }
      setName(next.displayName || next.email || "Account");
      stopProfile = onSnapshot(doc(getFirebaseDb(), "customers", next.uid), (snapshot) => {
        setName(snapshot.data()?.name || next.displayName || next.email || "Account");
        setLoading(false);
      }, () => setLoading(false));
    });
    return () => { stopAuth(); stopProfile?.(); };
  }, []);
  return { user, name, loading };
}

export async function customerSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await signInWithPopup(getFirebaseAuth(), provider);
  const ref = doc(getFirebaseDb(), "customers", user.uid);
  const existing = await getDoc(ref);
  const old = existing.data();
  await setDoc(ref, {
    uid: user.uid, name: old?.name || user.displayName || "", email: user.email || "",
    phone: old?.phone || "", birthDetails: old?.birthDetails || {
      dateOfBirth: "", timeOfBirth: "", placeOfBirth: "", currentCity: "",
    }, updatedAt: serverTimestamp(),
  }, { merge: true });
  return user;
}

export async function customerSignInWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  await ensureProfile(user);
  return user;
}

export async function customerRegisterWithEmail(input: {
  name: string; email: string; phone: string; password: string;
  birthDetails: CustomerProfile["birthDetails"];
}) {
  const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), input.email.trim(), input.password);
  await updateProfile(user, { displayName: input.name.trim() });
  await setDoc(doc(getFirebaseDb(), "customers", user.uid), {
    uid: user.uid, name: input.name.trim(), email: user.email || input.email.trim(),
    phone: input.phone, birthDetails: input.birthDetails, updatedAt: serverTimestamp(),
  }, { merge: true });
  return user;
}

async function ensureProfile(user: User) {
  const ref = doc(getFirebaseDb(), "customers", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;
  await setDoc(ref, {
    uid: user.uid, name: user.displayName || "", email: user.email || "", phone: "",
    birthDetails: { dateOfBirth: "", timeOfBirth: "", placeOfBirth: "", currentCity: "" },
    updatedAt: serverTimestamp(),
  });
}

export async function saveCustomerProfile(user: User, profile: Omit<CustomerProfile, "uid" | "email">) {
  await setDoc(doc(getFirebaseDb(), "customers", user.uid), {
    uid: user.uid, name: profile.name, email: user.email || "", phone: profile.phone,
    birthDetails: profile.birthDetails, updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function customerSignOut() { return signOut(getFirebaseAuth()); }
