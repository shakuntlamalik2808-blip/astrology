import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Firebase is fully env-driven. Every value comes from VITE_FIREBASE_*
 * variables (see .env.example). Nothing is hardcoded here, and the client
 * refuses to initialize with a clear error if configuration is missing.
 */

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

type RequiredEnvKey = (typeof required)[number];

function readEnv(key: RequiredEnvKey): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing Firebase configuration: ${key}. Copy .env.example to .env and fill in your Firebase project values.`,
    );
  }
  return value;
}

function buildConfig() {
  const measurementId = import.meta.env["VITE_FIREBASE_MEASUREMENT_ID"] as string | undefined;
  return {
    apiKey: readEnv("VITE_FIREBASE_API_KEY"),
    authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("VITE_FIREBASE_APP_ID"),
    // Optional — only present when Analytics is enabled for the project.
    ...(measurementId ? { measurementId } : {}),
  };
}

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(buildConfig());
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/** True when all required VITE_FIREBASE_* values are present. */
export function isFirebaseConfigured(): boolean {
  return required.every((k) => Boolean(import.meta.env[k]));
}
