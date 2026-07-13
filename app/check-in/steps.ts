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
        instruction: "Confirm the hacker's information on file is correct. If needed, validate against the Boarding Pass as well.",
    },
    {
        stepName: "confirmTeam",
        friendlyName: "Confirm Team",
        instruction:
            "Check this hacker's team is correct by saying all members, who checked-in and who yet to check-in. Let the hacker explicitly says that the composition is correct. Add or remove members if needed.",
        showWhen: (ctx) => ctx.inTeam,
    },
    {
        stepName: "verifyTable",
        friendlyName: "Verify Table",
        instruction:
            "Check the table sticker on the lanyard against this hacker's assigned table shown below. The location and table number must match. If the sticker is wrong or missing, fix it before handing over the lanyard.",
        showWhen: (ctx) => ctx.hasTable,
    },
    {
        stepName: "announceTable",
        friendlyName: "Tell Their Table",
        instruction:
            "Tell the hacker their table number and where to find it, out loud.",
        showWhen: (ctx) => ctx.hasTable,
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
        instruction: "Take the hacker's check-in photo with the freebies. Make sure their face is visible.",
        skippable: true,
    },
    {
        stepName: "speedDatingBooth",
        friendlyName: "Speed Dating Booth",
        instruction:
            "This hacker opted into Speed Dating. Direct them to the Speed Dating Booth, near the VIP booth.",
        showWhen: (ctx) => ctx.joiningSpeedDating,
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
