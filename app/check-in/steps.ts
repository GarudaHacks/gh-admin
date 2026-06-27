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
        stepName: "doGroupCheckin",
        friendlyName: "Group Check-in",
        instruction: "Scan the QR codes of the rest of the team in one batch.",
        skippable: true,
        showWhen: (ctx) => ctx.inTeam,
    },
    {
        stepName: "checkOtherMembers",
        friendlyName: "Verify Team Members",
        instruction: "Confirm each scanned teammate's identity.",
        showWhen: (ctx) => ctx.inTeam,
    },
    {
        stepName: "underageOvernightSignedConsent",
        friendlyName: "Signed Consent",
        instruction: "Collect the signed overnight consent form.",
        showWhen: (ctx) => ctx.isUnderage,
    },
    {
        stepName: "giveLanyard",
        friendlyName: "Give Lanyard",
        instruction: "Hand over the lanyard and badge.",
    },
    {
        stepName: "giveFreebies",
        friendlyName: "Give Freebies",
        instruction: "Hand over the swag bag and freebies.",
    },
    {
        stepName: "takePicture",
        friendlyName: "Take Picture",
        instruction: "Take the hacker's check-in photo.",
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
