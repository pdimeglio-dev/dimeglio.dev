import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Error from "./error";

const { mockCaptureError, mockTrackEvent } = vi.hoisted(() => ({
  mockCaptureError: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  captureError: mockCaptureError,
  trackEvent: mockTrackEvent,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Error boundary page", () => {
  const error = Object.assign(new window.Error("Something broke"), {
    digest: "abc123",
  });
  const retry = vi.fn();

  it("renders error message and action buttons", () => {
    render(<Error error={error} unstable_retry={retry} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
    expect(screen.getByText("Go home")).toBeInTheDocument();
  });

  it("reports the error to PostHog on mount", () => {
    render(<Error error={error} unstable_retry={retry} />);

    expect(mockCaptureError).toHaveBeenCalledWith(error);
    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: "error_boundary_displayed",
      properties: {
        error_message: "Something broke",
        digest: "abc123",
      },
    });
  });

  it("calls unstable_retry when 'Try again' is clicked", () => {
    render(<Error error={error} unstable_retry={retry} />);

    fireEvent.click(screen.getByText("Try again"));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("has a link to the home page", () => {
    render(<Error error={error} unstable_retry={retry} />);

    const homeLink = screen.getByText("Go home");
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
