import "server-only";
import { lookup } from "node:dns/promises";

// SSRF guard for the research engine (review finding, P2).
//
// The research route fetches a company URL that the USER supplies. Without a
// guard, a candidate (or anyone who reaches the route) could point it at
// internal services — cloud metadata (169.254.169.254), the Upstash REST
// endpoint, localhost admin panels — and exfiltrate or pivot. This module
// rejects non-http(s) schemes, embedded credentials, and any host that
// resolves to a private / link-local / loopback / metadata address.
//
// Two layers: validateUrlShape (pure, synchronous — scheme + literal-IP host)
// and assertSafeFetchUrl (async — also DNS-resolves the host and checks every
// returned address). Keep the pure layer separately testable.

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** True if an IPv4/IPv6 string is private, loopback, link-local, or unspecified. */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.trim().toLowerCase();

  // IPv6
  if (addr.includes(":")) {
    if (addr === "::1" || addr === "::") return true; // loopback / unspecified
    if (addr.startsWith("fe80")) return true; // link-local
    if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local fc00::/7
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — extract and re-check.
    const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  // IPv4
  const parts = addr.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    // Not a dotted-quad — treat as non-IP (caller handles hostnames).
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

const BLOCKED_HOSTNAMES = new Set(["localhost"]);

/**
 * Synchronous shape validation: scheme, no embedded credentials, and — when the
 * host is a literal IP — that it isn't private. Returns the parsed URL or throws.
 * Does NOT resolve DNS (see assertSafeFetchUrl for that).
 */
export function validateUrlShape(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("Not a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Unsupported scheme '${url.protocol}' — only http/https.`);
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with embedded credentials are not allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new SsrfError("Refusing to fetch localhost.");
  }
  if (isPrivateAddress(host)) {
    throw new SsrfError("Refusing to fetch a private/link-local address.");
  }
  return url;
}

/**
 * Full guard used at fetch time: validate shape, then DNS-resolve the host and
 * reject if ANY resolved address is private. Returns the safe URL string.
 */
export async function assertSafeFetchUrl(rawUrl: string): Promise<string> {
  const url = validateUrlShape(rawUrl);

  // If the host is already a literal IP, validateUrlShape covered it.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const isLiteralIp = /^[0-9.]+$/.test(host) || host.includes(":");
  if (isLiteralIp) return url.toString();

  let results: Array<{ address: string }>;
  try {
    results = await lookup(host, { all: true });
  } catch {
    throw new SsrfError(`Could not resolve host '${host}'.`);
  }
  if (results.length === 0) {
    throw new SsrfError(`Host '${host}' did not resolve.`);
  }
  for (const { address } of results) {
    if (isPrivateAddress(address)) {
      throw new SsrfError(
        `Host '${host}' resolves to a private address — refusing to fetch.`
      );
    }
  }
  return url.toString();
}
