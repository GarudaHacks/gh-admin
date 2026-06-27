"use client";

import { useMemo, useReducer } from "react";
import {
    type CheckInContext,
    type CheckInStep,
    stepsForContext,
} from "./steps";

export type StepStatus = "pending" | "done" | "skipped";

interface FlowState {
    /** Index into the *filtered* steps array. */
    index: number;
    /** Status per stepName. Steps not present are implicitly "pending". */
    statuses: Record<string, StepStatus>;
}

type FlowAction =
    | { type: "complete" }
    | { type: "skip" }
    | { type: "back" }
    | { type: "goTo"; index: number }
    | { type: "reset" };

function reducer(steps: CheckInStep[]) {
    return (state: FlowState, action: FlowAction): FlowState => {
        const current = steps[state.index];

        switch (action.type) {
            case "complete":
            case "skip": {
                if (!current) return state;
                const status: StepStatus =
                    action.type === "skip" ? "skipped" : "done";
                return {
                    index: Math.min(state.index + 1, steps.length),
                    statuses: { ...state.statuses, [current.stepName]: status },
                };
            }
            case "back": {
                if (state.index === 0) return state;
                const prev = steps[state.index - 1];
                // Re-open the step we're stepping back into.
                const { [prev.stepName]: _drop, ...rest } = state.statuses;
                return { index: state.index - 1, statuses: rest };
            }
            case "goTo": {
                // Jump back to an earlier step and re-open it, clearing the
                // status of that step and everything after it.
                if (action.index < 0 || action.index >= state.index) return state;
                const statuses = { ...state.statuses };
                for (let i = action.index; i < steps.length; i++) {
                    delete statuses[steps[i].stepName];
                }
                return { index: action.index, statuses };
            }
            case "reset":
                return { index: 0, statuses: {} };
            default:
                return state;
        }
    };
}

const initialState: FlowState = { index: 0, statuses: {} };

/**
 * Drives the guided check-in. Filters steps to the hacker's context, tracks the
 * current position and per-step status, and exposes advance / skip / back.
 */
export function useCheckInFlow(ctx: CheckInContext) {
    const steps = useMemo(() => stepsForContext(ctx), [ctx]);
    const [state, dispatch] = useReducer(reducer(steps), initialState);

    const currentStep = steps[state.index] ?? null;
    const isComplete = state.index >= steps.length;

    return {
        steps,
        currentStep,
        currentIndex: state.index,
        total: steps.length,
        isComplete,
        statusOf: (stepName: string): StepStatus =>
            state.statuses[stepName] ?? "pending",
        canGoBack: state.index > 0,
        next: () => dispatch({ type: "complete" }),
        skip: () => dispatch({ type: "skip" }),
        back: () => dispatch({ type: "back" }),
        goTo: (index: number) => dispatch({ type: "goTo", index }),
        reset: () => dispatch({ type: "reset" }),
    };
}
