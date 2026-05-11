import "server-only";
import {
  PUBLIC_FRAMEWORKS,
  type FrameworkSpec,
} from "@/lib/llm/prompts/framework-library";

// R21 server-side-enforced private framework loading. The operator's
// private library lives in OPERATOR_PRIVATE_FRAMEWORKS (JSON-encoded array)
// — read only at server-render time and never bundled into client JS.
//
// Caller identifies as the operator by sending X-Operator-Token in the
// request, which is checked against OPERATOR_SECRET. If either is absent
// or mismatched, the caller gets the public library only.
//
// The "server-only" import above is a Next.js build-time guard: any
// component that imports this module is forbidden from being a client
// component. If you see a build error pointing here, the import path is
// reaching a client surface that shouldn't see private frameworks.

function isOperatorToken(token: string | null): boolean {
  if (!token) return false;
  const secret = process.env.OPERATOR_SECRET;
  if (!secret || secret.length === 0) return false;
  // Constant-time compare not worth it for our threat model — the token
  // is a pre-shared secret over HTTPS, not a user-controlled value.
  return token === secret;
}

function loadPrivateLibrary(): ReadonlyArray<FrameworkSpec> {
  const raw = process.env.OPERATOR_PRIVATE_FRAMEWORKS;
  if (!raw || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw) as FrameworkSpec[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // Malformed JSON — fall back silently. Operator will notice their
    // private library isn't loading and check the env var.
    return [];
  }
}

/**
 * Resolve the active framework library for this request.
 *
 * @param operatorToken Value of the X-Operator-Token request header, or null.
 * @returns Operator's private library when both token + env-var match,
 *          otherwise the public library.
 */
export function getActiveFrameworks(
  operatorToken: string | null
): ReadonlyArray<FrameworkSpec> {
  if (!isOperatorToken(operatorToken)) {
    return PUBLIC_FRAMEWORKS;
  }
  const privateLib = loadPrivateLibrary();
  if (privateLib.length === 0) {
    // Operator authenticated but env-var is empty/malformed; fall back
    // to public rather than ship a no-framework session.
    return PUBLIC_FRAMEWORKS;
  }
  return privateLib;
}
