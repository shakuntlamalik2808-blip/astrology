const requiredFirebaseKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function getMissingFirebaseConfigKeys(): string[] {
  return requiredFirebaseKeys.filter((key) => !import.meta.env[key]);
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseConfigKeys().length === 0;
}
