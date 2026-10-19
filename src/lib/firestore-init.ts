/**
 * firestore-init.ts
 *
 * Handles a fresh / empty Firestore database gracefully.
 *
 * Firestore collections do NOT need to be "created" — they spring into
 * existence the moment a document is written. On a brand-new database:
 *
 *  1. `orderBy` queries on empty collections require a composite index that
 *     may not exist yet → they throw a "failed-precondition" error containing
 *     a link to create the index, or we can fall back to unordered reads.
 * This module exports helpers to detect common query and permission errors.
 */

/** This module exports Firestore error helpers for admin data views. */

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
