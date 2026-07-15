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
        instruction: "Scan the participant's boarding pass QR code.",
    },
    {
        stepName: "askIdCard",
        friendlyName: "Verify ID",
        instruction: "Ask the participant to present a National ID, School ID, or any government- or institution-issued ID for verification.",
    },
    {
        stepName: "getHackerInformations",
        friendlyName: "Confirm Details",
        instruction: "Verify the participant's ID against their name and date of birth on the screen. A one-day difference in the date of birth is acceptable. Then verify the boarding pass against all displayed information.",
    },
    {
        stepName: "confirmTeam",
        friendlyName: "Confirm Team",
        instruction: "Read each team member's name and check-in status. Confirm the team composition is correct. Add or remove members if needed.",
        showWhen: (ctx) => ctx.inTeam,
    },
    {
        stepName: "createMobileTeam",
        friendlyName: "Create Mobile Team",
        instruction: "Ask the participant to create or join their team in the mobile app if they have not already done so.",
        showWhen: (ctx) => ctx.needsMobileTeam,
    },
    {
        stepName: "confirmOvernight",
        friendlyName: "Overnight Plan",
        instruction: "Confirm the participant's overnight plan. Update it if they wish to make changes.",
    },
    {
        stepName: "verifyTable",
        friendlyName: "Verify Table",
        instruction: "Check that the table number and team number on the lanyard match the assignment shown on the screen. Fix any missing or incorrect labels before handing over the lanyard.",
        showWhen: (ctx) => ctx.hasTable,
    },
    {
        stepName: "announceTable",
        friendlyName: "Tell Their Table",
        instruction: "Tell the participant their assigned table number and its location.",
        showWhen: (ctx) => ctx.hasTable,
    },
    {
        stepName: "noTableYet",
        friendlyName: "No Table Yet",
        instruction: "Inform the participant that they do not have a table assignment yet because they are joining Speed Dating. Direct them to the Speed Dating Booth after completing check-in.",
        showWhen: (ctx) => !ctx.hasTable,
    },
    {
        stepName: "giveLanyard",
        friendlyName: "Give Lanyard",
        instruction: "Hand over the lanyard.",
    },
    {
        stepName: "giveFreebies",
        friendlyName: "Give Freebies",
        instruction: "Hand over the freebies.",
    },
    {
        stepName: "takePicture",
        friendlyName: "Take Picture",
        instruction: "Take a check-in photo with the participant holding their freebies. Make sure their face is clearly visible.",
        skippable: true,
    },
    {
        stepName: "speedDatingBooth",
        friendlyName: "Speed Dating Booth",
        instruction: "Direct the participant to the Speed Dating Booth near the VIP Booth.",
        showWhen: (ctx) => ctx.joiningSpeedDating,
    },
    {
        stepName: "smileAndSayGoodLuck",
        friendlyName: "All Done!",
        instruction: "Smile and wish them good luck! 🎉",
    },
];

/** Returns the steps that apply to a given hacker, in flow order. */
export function stepsForContext(ctx: CheckInContext): CheckInStep[] {
    return CheckInSteps.filter((step) => !step.showWhen || step.showWhen(ctx));
}
