/**
 * Definition of the guided check-in flow. Per-hacker progress lives in the step machine
 * (see useCheckInFlow), keyed by `stepName`.
 */

import type { CheckInContext } from "@/lib/checkin-types";

export type { CheckInContext };

export interface CheckInStep {
    stepName: string;
    friendlyName: string;
    instruction?: string;
    skippable?: boolean; // can be skipped
    showWhen?: (ctx: CheckInContext) => boolean; // show only when true; when none, always show
}

export const CheckInSteps: CheckInStep[] = [
    {
        stepName: "scanQr",
        friendlyName: "Scan QR",
        instruction: "Scan the hacker's boarding pass QR code.",
    },
    {
        stepName: "askIdCard",
        friendlyName: "Verify ID",
        instruction: "Ask for a photo ID and confirm the name matches.",
    },
    {
        stepName: "getHackerInformations",
        friendlyName: "Confirm Details",
        instruction: "Confirm the hacker's information on file is correct.",
    },
    {
        stepName: "confirmTeam",
        friendlyName: "Confirm Team",
        instruction:
            "Check this hacker's team is correct. Add or remove members if needed.",
        showWhen: (ctx) => ctx.inTeam,
    },
    {
        stepName: "giveLanyard",
        friendlyName: "Give Lanyard",
        instruction: "Hand over the lanyard",
    },
    {
        stepName: "giveFreebies",
        friendlyName: "Give Freebies",
        instruction: "Hand over the freebies.",
    },
    {
        stepName: "takePicture",
        friendlyName: "Take Picture",
        instruction: "Take the hacker's check-in photo.",
        skippable: true,
    },
    {
        stepName: "smileAndSayGoodLuck",
        friendlyName: "All Done!",
        instruction: "Smile and wish them good luck \u{1F389}",
    },
];

/** Returns the steps that apply to a given hacker, in flow order. */
export function stepsForContext(ctx: CheckInContext): CheckInStep[] {
    return CheckInSteps.filter((step) => !step.showWhen || step.showWhen(ctx));
}
