import { describe, expect, it } from "vitest";
import { validatePrepInputs, type PrepInputs } from "@/components/screen/prep-form";

function inputs(over: Partial<PrepInputs> = {}): PrepInputs {
  return {
    company: "Fireflies",
    companyUrl: "https://fireflies.ai",
    role: "Product Manager",
    jobDescription: "We are looking for a PM to own the AI notetaker roadmap.",
    ...over,
  };
}

describe("validatePrepInputs", () => {
  it("passes a complete, valid form", () => {
    expect(validatePrepInputs(inputs()).ok).toBe(true);
  });

  it("requires company, role, and a substantial JD", () => {
    const r = validatePrepInputs(
      inputs({ company: "", role: "", jobDescription: "short" })
    );
    expect(r.ok).toBe(false);
    expect(r.errors.company).toBeDefined();
    expect(r.errors.role).toBeDefined();
    expect(r.errors.jobDescription).toBeDefined();
  });

  it("treats the URL as optional", () => {
    expect(validatePrepInputs(inputs({ companyUrl: "" })).ok).toBe(true);
  });

  it("rejects a malformed URL", () => {
    expect(validatePrepInputs(inputs({ companyUrl: "not a url" })).errors.companyUrl).toBeDefined();
  });

  it("rejects a non-http(s) URL scheme", () => {
    expect(
      validatePrepInputs(inputs({ companyUrl: "ftp://files.com" })).errors.companyUrl
    ).toBeDefined();
  });
});
