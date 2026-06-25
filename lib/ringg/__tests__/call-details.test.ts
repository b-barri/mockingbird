import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCallDetails, RinggApiError } from "@/lib/ringg/call-details";

// Shaped from a real GET /calling/call-details response (call 6c434fac…).
function realResponse() {
  return {
    status: "success",
    data: {
      id: "6c434fac-dca1-430b-a32d-761f7a6f79b2",
      call_direction: "webcall",
      call_status: "completed",
      callee_name: "Bhavya",
      transcription_url:
        '[{"bot": "Hi Bhavya, ready?", "message_id": "x"}, {"user": "Let\'s go.", "message_id": "y"}]',
      custom_args_values: {
        role: "Product Manager",
        company: "Fireflies.ai",
        session_id: "brief-123",
      },
    },
  };
}

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      json: async () => body,
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchCallDetails", () => {
  it("parses status, direction, transcript turns, and echoed variables", async () => {
    mockFetchOnce(realResponse());
    const details = await fetchCallDetails("6c434fac", "KEY");

    expect(details.callStatus).toBe("completed");
    expect(details.callDirection).toBe("webcall");
    expect(details.calleeName).toBe("Bhavya");
    expect(details.entries).toEqual([
      { speaker: "interviewer", text: "Hi Bhavya, ready?" },
      { speaker: "candidate", text: "Let's go." },
    ]);
    // custom_args_values carries our correlation key back.
    expect(details.customArgs.session_id).toBe("brief-123");
  });

  it("sends the workspace key in the X-API-KEY header", async () => {
    mockFetchOnce(realResponse());
    await fetchCallDetails("abc", "SECRET_KEY");
    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain("/calling/call-details?id=abc");
    expect(call[1].headers["X-API-KEY"]).toBe("SECRET_KEY");
  });

  it("throws RinggApiError with the status on a non-OK response", async () => {
    mockFetchOnce({}, false, 404);
    await expect(fetchCallDetails("missing", "KEY")).rejects.toMatchObject({
      name: "RinggApiError",
      status: 404,
    });
  });

  it("returns empty entries (not an error) when the transcript isn't ready", async () => {
    mockFetchOnce({
      status: "success",
      data: { id: "x", call_direction: "webcall", call_status: "in-progress" },
    });
    const details = await fetchCallDetails("x", "KEY");
    expect(details.callStatus).toBe("in-progress");
    expect(details.entries).toEqual([]);
  });

  it("wraps a network failure in RinggApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );
    await expect(fetchCallDetails("x", "KEY")).rejects.toBeInstanceOf(
      RinggApiError
    );
  });
});
