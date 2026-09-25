import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseConfigured,
} from "./firebase";

/**
 * A user is an admin only if they (1) sign in with Google via Firebase
 * account AND (2) have a document at admins/{uid}. Firestore rules enforce the same
 * check server-side, so bypassing this UI grants no data access.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function adminSignInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(getFirebaseAuth(), provider);
  if (!(await isAdmin(cred.user.uid))) {
    await signOut(getFirebaseAuth());
    throw new Error("not-admin");
  }
  return cred.user;
}

export function adminSignOut() {
  return signOut(getFirebaseAuth());
}

export type AdminState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unconfigured" }
  | { status: "admin"; user: User };

export function useAdminAuth(): AdminState {
  const [state, setState] = useState<AdminState>({ status: "loading" });
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState({ status: "unconfigured" });
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (!user) return setState({ status: "signed-out" });
      if (await isAdmin(user.uid)) setState({ status: "admin", user });
      else {
        await signOut(getFirebaseAuth());
        setState({ status: "signed-out" });
      }
    });
  }, []);
  return state;
}

export function authErrorMessage(err: unknown): string {
  const code =
    (err as { code?: string; message?: string })?.code ??
    (err as Error)?.message ??
    "";
  if (code === "not-admin") return "This account does not have admin access.";
  if (
    code.includes("popup-closed-by-user") ||
    code.includes("cancelled-popup-request")
  )
    return "Sign-in was cancelled.";
  if (code.includes("popup-blocked"))
    return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
  if (code.includes("unauthorized-domain"))
    return "This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorised domains.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (code.includes("network"))
    return "Network error. Check your connection and try again.";
  return "Sign-in failed. Please try again.";
}
