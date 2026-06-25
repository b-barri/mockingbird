import { describe, expect, it } from "vitest";
import {
  isPrivateAddress,
  validateUrlShape,
  SsrfError,
} from "@/lib/research/ssrf";
import { htmlToText } from "@/lib/research/sources";
import { parseBriefResponse, type BriefMeta } from "@/lib/research";

const META: BriefMeta = {
  id: "id-1",
  company: "Fireflies",
  role: "PM",
  companyUrl: "https://fireflies.ai",
  generatedAt: 123,
};

// --- SSRF guard -------------------------------------------------------------

describe("isPrivateAddress", () => {
  it("flags private / loopback / link-local / metadata addresses", () => {
    for (const ip of [
      "10.0.0.5",
      "127.0.0.1",
      "0.0.0.0",
      "169.254.169.254", // cloud metadata
      "192.168.1.1",
      "172.16.0.1",
      "172.31.255.255",
      "100.64.0.1",
      "::1",
      "fe80::1",
      "fc00::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});

describe("validateUrlShape", () => {
  it("accepts a normal https company URL", () => {
    expect(() => validateUrlShape("https://fireflies.ai/product")).not.toThrow();
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => validateUrlShape("ftp://x.com")).toThrow(SsrfError);
    expect(() => validateUrlShape("file:///etc/passwd")).toThrow(SsrfError);
  });

  it("rejects embedded credentials", () => {
    expect(() => validateUrlShape("https://user:pass@evil.com")).toThrow(
      SsrfError
    );
  });

  it("rejects localhost and literal private IPs", () => {
    expect(() => validateUrlShape("http://localhost:3000")).toThrow(SsrfError);
    expect(() => validateUrlShape("http://127.0.0.1/admin")).toThrow(SsrfError);
    expect(() => validateUrlShape("http://169.254.169.254/latest/meta-data")).toThrow(
      SsrfError
    );
    expect(() => validateUrlShape("http://192.168.0.1")).toThrow(SsrfError);
  });
});

// --- html extraction --------------------------------------------------------

describe("htmlToText", () => {
  it("strips tags, scripts, and styles", () => {
    const html =
      "<html><head><style>.a{color:red}</style></head><body><script>alert(1)</script><h1>Fireflies</h1><p>AI notetaker</p></body></html>";
    const text = htmlToText(html);
    expect(text).toContain("Fireflies");
    expect(text).toContain("AI notetaker");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("<");
  });
});

// --- brief parsing + graceful degradation -----------------------------------

function rawBrief(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    likelyQuestions: [
      { question: "Why us?", rationale: "fit", companySpecific: true },
    ],
    evalParameters: [
      { name: "Product sense", description: "reasons from need" },
      { name: "Communication", description: "clear" },
    ],
    companySignals: [
      { point: "AI notetaker product", companySpecific: true },
    ],
    candidateGaps: ["no B2B experience"],
    hasCompanySignal: true,
    ...over,
  });
}

describe("parseBriefResponse", () => {
  it("parses a well-formed brief and stamps meta", () => {
    const b = parseBriefResponse(rawBrief(), META);
    expect(b.company).toBe("Fireflies");
    expect(b.id).toBe("id-1");
    expect(b.evalParameters).toHaveLength(2);
    expect(b.hasCompanySignal).toBe(true);
  });

  it("tolerates a markdown code fence", () => {
    const fenced = "```json\n" + rawBrief() + "\n```";
    expect(() => parseBriefResponse(fenced, META)).not.toThrow();
  });

  it("degrades: hasCompanySignal false when nothing is company-specific", () => {
    const raw = rawBrief({
      likelyQuestions: [
        { question: "Walk me through a launch", rationale: "role", companySpecific: false },
      ],
      companySignals: [],
      hasCompanySignal: true, // model claims signal, but nothing is flagged specific
    });
    const b = parseBriefResponse(raw, META);
    expect(b.hasCompanySignal).toBe(false);
  });

  it("defaults companySpecific to false when the model omits it", () => {
    const raw = rawBrief({
      companySignals: [{ point: "something" }], // no companySpecific flag
    });
    const b = parseBriefResponse(raw, META);
    expect(b.companySignals[0].companySpecific).toBe(false);
  });

  it("throws when there are no eval parameters", () => {
    expect(() => parseBriefResponse(rawBrief({ evalParameters: [] }), META)).toThrow();
  });

  it("throws on non-JSON", () => {
    expect(() => parseBriefResponse("sorry, I cannot", META)).toThrow();
  });
});
