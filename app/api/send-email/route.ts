import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { resultsAreHere } from "@/templates/resultsAreHere";

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: Number(process.env.SES_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});

const fromAddress =
  process.env.SES_FROM_EMAIL ||
  "Garuda Hacks <no-reply@send.garudahacks.com>";

const createResultsAreHereMailOptions = (email: string): MailOptions => ({
  from: fromAddress,
  to: email,
  subject: "Garuda Hacks 7.0 - Your Results Are Here!",
  html: resultsAreHere({ actionUrl: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}` || "https://portal.garudahacks.com" }),
  text: `Results Are Here!\n\nThe wait is finally over! Head to the portal to see your application result. Whatever happens, we're rooting for you 🚀\n\nOpen Portal: https://portal.garudahacks.com\n\nRegards,\nGaruda Hacks 7.0 Committee\n\n© 2026 Garuda Hacks. All rights reserved.`,
});

function getMailOptions(email: string): MailOptions {
return createResultsAreHereMailOptions(email);
//   switch (type) {
//     case "resultsAreHere":
//     case "accepted":
//     default:
//       return createAcceptanceMailOptions(email);
//   }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, emails } = body;

    const recipients: string[] = emails || (email ? [email] : []);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameter: email or emails" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      recipients.map(async (recipientEmail: string) => {
        const mailOptions = getMailOptions(recipientEmail);
        await transporter.sendMail(mailOptions);
        return recipientEmail;
      })
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (recipients.length === 1 && failed > 0) {
      const error = (results[0] as PromiseRejectedResult).reason;
      return NextResponse.json(
        { error: "Failed to send email", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Sent ${succeeded} email(s)`,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to send email", details: errorMessage },
      { status: 500 }
    );
  }
}
