import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCaptureException, mockSentryCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
  mockSentryCaptureException: vi.fn(),
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    captureException = mockCaptureException;
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockSentryCaptureException,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("captureServerError", () => {
  it("still calls Sentry even when POSTHOG_KEY is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");

    vi.resetModules();
    const { captureServerError } = await import("./posthog-server");

    const err = new Error("test");
    captureServerError(err);

    expect(mockSentryCaptureException).toHaveBeenCalledWith(err, { extra: undefined });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it("calls both Sentry and PostHog when key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");

    vi.resetModules();
    const { captureServerError } = await import("./posthog-server");

    const err = new Error("something broke");
    captureServerError(err, { route: "/api/chat" });

    expect(mockSentryCaptureException).toHaveBeenCalledWith(err, {
      extra: { route: "/api/chat" },
    });
    expect(mockCaptureException).toHaveBeenCalledWith(
      err,
      "server",
      { route: "/api/chat" }
    );
  });

  it("handles non-Error values without throwing", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");

    vi.resetModules();
    const { captureServerError } = await import("./posthog-server");

    expect(() => captureServerError("string error")).not.toThrow();
    expect(() => captureServerError(null)).not.toThrow();
    expect(() => captureServerError(42)).not.toThrow();
  });
});
