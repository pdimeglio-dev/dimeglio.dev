"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { AvailabilityPickerProps } from "@/lib/chat-widgets";
import { trackEvent, captureError } from "@/lib/analytics";

type PickerState = "selecting" | "booking" | "booked" | "fallback" | "error";

export function AvailabilityPicker({
  days,
  eventTypeUri,
  timezone,
  fallbackUrl,
}: AvailabilityPickerProps) {
  const [state, setState] = useState<PickerState>("selecting");
  const [selectedDay, setSelectedDay] = useState(0);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);

  // ── Fallback mode: MCP unavailable ────────────────────────────────────
  if (days.length === 0 && fallbackUrl) {
    return (
      <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-3">
        <div className="mb-3 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-300">
            Couldn&apos;t load live availability right now. You can schedule
            directly on Calendly.
          </p>
        </div>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackEvent({
              event: "calendly_fallback_shown",
              properties: { reason: "mcp_unavailable" },
            });
          }}
          className="flex items-center justify-center gap-2 rounded-md border border-slate-600/60 bg-slate-800/50 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700/50"
        >
          <Calendar className="h-4 w-4 shrink-0" />
          Open Calendly
          <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
        </a>
      </div>
    );
  }

  // ── No slots available ────────────────────────────────────────────────
  if (days.length === 0) {
    return (
      <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-4 text-center">
        <p className="text-sm text-slate-400">
          No available time slots found in the next two weeks.
        </p>
      </div>
    );
  }

  // ── Booked state ──────────────────────────────────────────────────────
  if (state === "booked" && bookingUrl) {
    const selectedTime = bookingSlot ? formatSlotTime(bookingSlot, timezone) : null;
    return (
      <div className="mt-2 rounded-lg border border-green-800/40 bg-green-950/20 p-3">
        <div className="mb-3 flex items-start gap-2.5">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-300">
              Scheduling link ready!
            </p>
            {selectedTime && (
              <p className="mt-0.5 text-xs text-slate-400">
                Select <span className="font-medium text-slate-300">{selectedTime}</span> on Calendly to complete your booking.
              </p>
            )}
          </div>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <Calendar className="h-4 w-4" />
          Complete Booking on Calendly
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  // ── Fallback after booking failure ────────────────────────────────────
  if (state === "fallback") {
    const url = fallbackUrl || "https://calendly.com/dimeglio-pablo";
    return (
      <div className="mt-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
        <div className="mb-3 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-amber-300">
            Couldn&apos;t generate a scheduling link. You can book directly on
            Calendly instead.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackEvent({
              event: "calendly_fallback_shown",
              properties: { reason: "booking_failed" },
            });
          }}
          className="flex items-center justify-center gap-2 rounded-md border border-amber-700/50 bg-amber-900/30 px-3 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-800/40"
        >
          <Calendar className="h-4 w-4 shrink-0" />
          Open Calendly
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
    );
  }

  // ── Selecting state: day tabs + time slot grid ────────────────────────
  const currentDay = days[selectedDay];

  async function handleSlotClick(startTime: string) {
    setState("booking");
    setBookingSlot(startTime);

    trackEvent({
      event: "calendly_slot_selected",
      properties: { slot_time: startTime, timezone },
    });

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTypeUri, startTime, timezone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState("fallback");
        return;
      }

      if (data.fallback) {
        if (data.url) setBookingUrl(data.url);
        setState("fallback");
        return;
      }

      trackEvent({
        event: "calendly_booking_completed",
        properties: {},
      });
      // Append ISO timestamp path so Calendly deep-links to the exact slot:
      // https://calendly.com/d/xxxx/YYYY-MM-DDTHH:MM:SS±HH:MM
      setBookingUrl(buildCalendlyUrl(data.url, startTime, timezone));
      setState("booked");
    } catch (error) {
      captureError(error);
      setState("fallback");
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-700/60 bg-black/30 p-3">
      <p className="mb-2 text-xs text-slate-500">
        Times shown in{" "}
        {timezone.replace(/_/g, " ").replace(/\//g, " / ")}
      </p>

      {/* Day pills — horizontal scrollable */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(i)}
            disabled={state === "booking"}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              i === selectedDay
                ? "bg-purple-600 text-white"
                : "border border-slate-600/60 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Time slots for selected day */}
      {currentDay && (
        <div className="grid grid-cols-3 gap-1.5">
          {currentDay.slots.map((slot) => {
            const isBooking =
              state === "booking" && bookingSlot === slot.startTime;
            return (
              <button
                key={slot.startTime}
                onClick={() => handleSlotClick(slot.startTime)}
                disabled={state === "booking"}
                className="flex items-center justify-center rounded-md border border-slate-600/60 bg-slate-800/50 px-2 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isBooking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  formatSlotTime(slot.startTime, timezone)
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSlotTime(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

/**
 * Builds a Calendly deep-link for a specific slot.
 * Uses `?date=` query param to pre-navigate to the correct date
 * (Calendly single-use links honour this for date selection).
 */
function buildCalendlyUrl(base: string, isoString: string, timezone: string): string {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  const month = dateStr.slice(0, 7); // YYYY-MM
  return `${base.replace(/\/$/, "")}?month=${month}&date=${dateStr}`;
}
