import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these are available when vi.mock factory runs (hoisted above imports)
const { mockCaptureException, mockCapture } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
  mockCapture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    captureException: mockCaptureException,
    capture: mockCapture,
    init: vi.fn(),
  },
}));

import { captureError, trackEvent } from "./analytics";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// captureError
// ---------------------------------------------------------------------------

describe("captureError", () => {
  it("does not throw for various error types", () => {
    expect(() => captureError(new Error("test error"))).not.toThrow();
    expect(() => captureError("string error")).not.toThrow();
    expect(() => captureError(null)).not.toThrow();
    expect(() => captureError(undefined)).not.toThrow();
  });

  it("does not throw when called server-side (no window)", () => {
    const original = globalThis.window;
    // @ts-expect-error — simulating server environment
    delete globalThis.window;
    expect(() => captureError(new Error("server"))).not.toThrow();
    globalThis.window = original;
  });
});

// ---------------------------------------------------------------------------
// trackEvent — error_boundary_displayed
// ---------------------------------------------------------------------------

describe("trackEvent", () => {
  it("accepts error_boundary_displayed event type without type error", () => {
    // Type-level test: this compiles without errors
    trackEvent({
      event: "error_boundary_displayed",
      properties: { error_message: "Something broke", digest: "abc123" },
    });

    trackEvent({
      event: "error_boundary_displayed",
      properties: { error_message: "No digest" },
    });
  });
});
