"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  SkipForward,
} from "lucide-react";
import type { ReactNode } from "react";
import type { CheckInStep } from "./steps";
import { type StepStatus, useCheckInFlow } from "./useCheckInFlow";

type Flow = ReturnType<typeof useCheckInFlow>;

/**
 * Renders the guided check-in as a vertical accordion: every applicable step is
 * a collapsible row, and the current step is expanded. Pass `slots` to inject
 * custom UI for specific steps (e.g. the QR scanner for "scanQr").
 */
export function StepCard({
  flow,
  slots,
  onReset,
}: {
  flow: Flow;
  slots?: Record<string, ReactNode>;
  /** Called when the admin restarts for the next hacker. Defaults to flow.reset. */
  onReset?: () => void;
}) {
  const reset = onReset ?? flow.reset;

  return (
    <div className="space-y-2">
      {flow.steps.map((step, i) => (
        <StepRow
          key={step.stepName}
          flow={flow}
          step={step}
          index={i}
          slot={slots?.[step.stepName]}
        />
      ))}

      {flow.isComplete && (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-400" />
          <p className="mt-2 text-base font-semibold text-emerald-100">
            Check-in complete
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-[#874ffe] px-4 py-2 text-sm font-medium text-white hover:bg-[#7440e0]"
          >
            Check in next hacker
          </button>
        </div>
      )}
    </div>
  );
}

function StepRow({
  flow,
  step,
  index,
  slot,
}: {
  flow: Flow;
  step: CheckInStep;
  index: number;
  slot?: ReactNode;
}) {
  const isCurrent = index === flow.currentIndex && !flow.isComplete;
  const isPast = index < flow.currentIndex;
  const status: StepStatus = isPast ? flow.statusOf(step.stepName) : "pending";
  const isExpanded = isCurrent;

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${isCurrent
          ? "border-[#874ffe]/60 bg-white/5"
          : "border-white/10 bg-white/[0.02]"
        }`}
    >
      {/* Header: clicking a completed step jumps back to it. */}
      <button
        type="button"
        disabled={!isPast}
        onClick={() => isPast && flow.goTo(index)}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left ${isPast ? "hover:bg-white/5" : "cursor-default"
          }`}
      >
        <StatusBadge status={status} isCurrent={isCurrent} index={index} />
        <span
          className={`flex-1 text-sm font-medium ${isCurrent ? "text-white" : "text-white/60"
            }`}
        >
          {step.friendlyName}
        </span>
        {status === "skipped" && (
          <span className="text-xs text-amber-300/80">skipped</span>
        )}
        <ChevronRight
          className={`h-4 w-4 text-white/30 transition-transform ${isExpanded ? "rotate-90" : ""
            }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          {step.instruction && (
            <p className="text-sm text-white/60">{step.instruction}</p>
          )}

          {slot && <div className="mt-3">{slot}</div>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={flow.back}
              disabled={!flow.canGoBack}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {step.skippable && (
                <button
                  onClick={flow.skip}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
              )}
              <button
                onClick={flow.next}
                className="inline-flex items-center gap-1 rounded-lg bg-[#874ffe] px-4 py-2 text-sm font-medium text-white hover:bg-[#7440e0]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  isCurrent,
  index,
}: {
  status: StepStatus;
  isCurrent: boolean;
  index: number;
}) {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold";
  if (status === "done") {
    return (
      <span className={`${base} bg-emerald-500/20 text-emerald-300`}>
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className={`${base} bg-amber-500/20 text-amber-300`}>
        <SkipForward className="h-3.5 w-3.5" />
      </span>
    );
  }
  return (
    <span
      className={`${base} ${isCurrent
          ? "bg-[#874ffe] text-white"
          : "bg-white/10 text-white/40"
        }`}
    >
      {index + 1}
    </span>
  );
}
