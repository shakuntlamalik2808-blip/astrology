import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";
import { ensureWhatsappSettings } from "./firestore-init";

/**
 * Any user who exists in Firebase Authentication is treated as an admin.
 * Access is controlled entirely by who you add/remove in the Firebase
 * Console → Authentication → Users tab.
 */

export async function adminSignInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(getFirebaseAuth(), provider);
  return cred.user;
}

export async function adminSignInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );
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
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (user) {
        // Seed required Firestore documents on first login to a fresh database
        ensureWhatsappSettings();
        setState({ status: "admin", user });
      } else {
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
  if (
    code.includes("wrong-password") ||
    code.includes("invalid-credential")
  )
    return "Incorrect email or password. Please try again.";
  if (code.includes("user-not-found"))
    return "No account found with this email address.";
  if (code.includes("invalid-email"))
    return "Please enter a valid email address.";
  if (code.includes("user-disabled"))
    return "This account has been disabled.";
  return "Sign-in failed. Please try again.";
}
