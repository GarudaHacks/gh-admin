import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface MailOptions {
  from: string | { name: string; address: string };
  to: string;
  subject: string;
  html: string;
  text: string;
}

const createAcceptanceMailOptions = (
  email: string,
  rsvpDeadline: string,
  teamDeadline: string,
  eventStartDate: string
): MailOptions => ({
  from: {
    name: "Garuda Hacks",
    address: "no-reply@garudahacks.com",
  },
  to: email,
  subject: "Congratulations! You're Accepted to Garuda Hacks 6.0!",
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Congratulations! You're Accepted to Garuda Hacks 6.0!</title>
        <style>
            /* Reset styles for email clients */
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <!-- Email Content Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: linear-gradient(135deg, #6B46C1 0%, #1E40AF 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                        
                        <!-- Header Section -->
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                <h1 style="color: white; font-size: 48px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.1;">
                                    Garuda<br>Hacks <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 8px; font-size: 24px; vertical-align: middle;">6.0</span>
                                </h1>
                                
                                <p style="color: #EC4899; font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                                    July 24 - 26 • 2025
                                </p>
                            </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <!-- Congratulations Section -->
                                <div style="background-color: rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; margin-bottom: 30px; backdrop-filter: blur(10px);">
                                    <h2 style="color: white; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; text-align: center;">
                                        🎉 Congratulations!
                                    </h2>
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                                        We're thrilled to inform you that your application has been <strong style="color: #EC4899;">accepted</strong> for Garuda Hacks 6.0!
                                    </p>
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0; text-align: center;">
                                        This year is an exciting time to to join Garuda Hacks. When we began planning for this year’s event, we collected feedback from previous years and decided to focus on the participant experience. From a career fair and a networking lunch, to a live judging round with VCs and a revamped application portal, we are determined to make this year our most engaging event yet. We hope that you will enjoy the experience.
                                    </p>
                                </div>
                                
                                <!-- Event Details -->
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                    <h3 style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
                                        📅 Event Details
                                    </h3>
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                        <tr>
                                            <td style="color: rgba(255,255,255,0.7); font-size: 14px; padding: 8px 0; width: 30%;">Date:</td>
                                            <td style="color: white; font-size: 14px; padding: 8px 0; font-weight: 500;">July 24 - 26, 2025</td>
                                        </tr>
                                        <tr>
                                            <td style="color: rgba(255,255,255,0.7); font-size: 14px; padding: 8px 0;">Location:</td>
                                            <td style="color: white; font-size: 14px; padding: 8px 0; font-weight: 500;">Universitas Multimedia Nusantara (UMN)</td>
                                        </tr>
                                        <tr>
                                            <td style="color: rgba(255,255,255,0.7); font-size: 14px; padding: 8px 0;">Duration:</td>
                                            <td style="color: white; font-size: 14px; padding: 8px 0; font-weight: 500;">30 Hours</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- Next Steps -->
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                    <h3 style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
                                        🚀 Next Steps
                                    </h3>
                                    <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                        <li style="margin-bottom: 10px;">RSVP on Portal to confirm your participation at <a href="https://portal.garudahacks.com/" style="color: white; text-decoration: underline;">portal.garudahacks.com</a></li>
                                        <li style="margin-bottom: 10px;">
                                            Join our Discord community for updates and networking: 
                                            <a href="https://discord.gg/5hVnu8t4mw" style="color: white; text-decoration: underline;">discord.gg/5hVnu8t4mw</a>
                                        </li>
                                        <li style="margin-bottom: 10px;">Add the official Garuda Hacks 6.0 Twibbon to your social media: <a href="https://twb.nz/garudahacks6" style="color: white; text-decoration: underline;">twb.nz/garudahacks6</a></li>
                                        <li style="margin-bottom: 10px;">Prepare your development environment and tools</li>
                                        <li style="margin-bottom: 10px;">Form your team or find teammates in our Discord</li>
                                        <li>Mark your calendar and get ready to hack!</li>
                                    </ul>
                                </div>
                                
                                <!-- CTA Buttons -->
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                        <tr>
                                            <td style="padding-right: 10px;">
                                                <a href="https://portal.garudahacks.com/" style="display: inline-block; background-color: #EC4899; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease;">
                                                    RSVP
                                                </a>
                                            </td>
                                            <td style="padding-left: 10px;">
                                                <a href="#" style="display: inline-block; background-color: transparent; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 2px solid rgba(255,255,255,0.3);">
                                                    View Guidebook
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- Contact Info -->
                                <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                                    <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 10px 0;">
                                        Questions? Contact us at <a href="mailto:hiba@garudahacks.com" style="color: #EC4899; text-decoration: none;">hiba@garudahacks.com</a>
                                    </p>
                                    <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">
                                        Follow us on social media for the latest updates
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
                        <tr>
                            <td style="text-align: center; padding: 20px;">
                                <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
                                    © 2025 Garuda Hacks. All rights reserved.
                                </p>
                                <p style="color: #999; font-size: 11px; margin: 0;">
                                    You received this email because you applied for Garuda Hacks 6.0.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `,
  text: `Welcome to Garuda Hacks 6.0!

🎉 Congratulations!
We're thrilled to inform you that your application has been accepted for Garuda Hacks 6.0! You're now part of Indonesia's largest hackathon - please RSVP on our portal to get ready for an incredible experience!

---

EVENT DETAILS
- Date: July 24 - 26, 2025
- Location: Universitas Multimedia Nusantara (UMN)
- Duration: 30 Hours

---

NEXT STEPS
1. RSVP on our portal to confirm your participation: https://portal.garudahacks.com/
2. Join our Discord community for updates and networking: https://discord.gg/5hVnu8t4mw
3. Add the official Garuda Hacks 6.0 Twibbon to your social media.
4. Prepare your development environment and tools.
5. Form your team or find teammates in our Discord.
6. Mark your calendar and get ready to hack!

---

Questions? Contact us at hiba@garudahacks.com
Follow us on social media for the latest updates.

© 2025 Garuda Hacks. All rights reserved.   
You received this email because you applied for Garuda Hacks 6.0.
`,
});

const createRejectionMailOptions = (email: string): MailOptions => ({
  from: {
    name: "Garuda Hacks",
    address: "no-reply@garudahacks.com",
  },
  to: email,
  subject: "Your Garuda Hacks 6.0 Application Status",
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Garuda Hacks 6.0 Application Status</title>
        <style>
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: linear-gradient(135deg, #64748B 0%, #334155 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                <h1 style="color: white; font-size: 40px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.1;">
                                    Garuda<br>Hacks <span style="background-color: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 8px; font-size: 22px; vertical-align: middle;">6.0</span>
                                </h1>
                                <p style="color: #F87171; font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                                    Application Update
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <div style="background-color: rgba(255,255,255,0.12); border-radius: 12px; padding: 30px; margin-bottom: 30px; backdrop-filter: blur(8px);">
                                    <h2 style="color: white; font-size: 26px; font-weight: 700; margin: 0 0 15px 0; text-align: center;">
                                        Thank you for applying
                                    </h2>
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                                        We appreciate your interest in Garuda Hacks 6.0. After careful consideration, we regret to inform you that we are unable to offer you a spot this year.
                                    </p>
                                    <p style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                                        The selection process was highly competitive, and we encourage you to apply again next year. Thank you for your passion and effort!
                                    </p>
                                </div>
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                    <p style="color: #F87171; font-size: 15px; margin: 0 0 10px 0;">
                                        If you have any questions, feel free to reach out to us at <a href="mailto:hiba@garudahacks.com" style="color: #F87171; text-decoration: underline;">hiba@garudahacks.com</a>.
                                    </p>
                                    <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">
                                        We wish you the best in your future hackathons and hope to see you at Garuda Hacks in the future!
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
                        <tr>
                            <td style="text-align: center; padding: 20px;">
                                <p style="color: #666; font-size: 12px; margin: 0 0 10px 0;">
                                    © 2025 Garuda Hacks. All rights reserved.
                                </p>
                                <p style="color: #999; font-size: 11px; margin: 0;">
                                    You received this email because you applied for Garuda Hacks 6.0.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `,
  text: `Your Garuda Hacks 6.0 Application Status\n\nThank you for applying to Garuda Hacks 6.0.\n\nAfter careful consideration, we regret to inform you that we are unable to offer you a spot this year.\n\nThe selection process was highly competitive, and we encourage you to apply again next year.\n\nIf you have any questions, feel free to reach out to us at hiba@garudahacks.com.\n\nWe wish you the best in your future hackathons and hope to see you at Garuda Hacks in the future!\n\n© 2025 Garuda Hacks. All rights reserved.\nYou received this email because you applied for Garuda Hacks 6.0.`,
});

const createWaitlistedMailOptions = (email: string): MailOptions => ({
  from: {
    name: "Garuda Hacks",
    address: "no-reply@garudahacks.com",
  },
  to: email,
  subject: "Your Garuda Hacks 6.0 Application Status: Waitlisted",
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Garuda Hacks 6.0 Application Status: Waitlisted</title>
        <style>
            body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }
            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }
            img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: linear-gradient(135deg, #FBBF24 0%, #F59E42 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                <h1 style="color: #fffbe6; font-size: 40px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.1;">
                                    Garuda<br>Hacks <span style="background-color: rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 8px; font-size: 22px; vertical-align: middle; color: #F59E42;">6.0</span>
                                </h1>
                                <p style="color: #F59E42; font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                                    Application Update
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <div style="background-color: rgba(255,255,255,0.18); border-radius: 12px; padding: 30px; margin-bottom: 30px; backdrop-filter: blur(8px);">
                                    <h2 style="color: #fffbe6; font-size: 26px; font-weight: 700; margin: 0 0 15px 0; text-align: center;">
                                        You're on the Waitlist!
                                    </h2>
                                    <p style="color: #fffbe6; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                                        Thank you for your interest in Garuda Hacks 6.0. At this time, you have been placed on our waitlist. Spots may open up as the event approaches, and we will notify you immediately if a spot becomes available.
                                    </p>
                                    <p style="color: #fffbe6; font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                                        We appreciate your patience and enthusiasm. Stay tuned for updates!
                                    </p>
                                </div>
                                <div style="background-color: rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                    <p style="color: #F59E42; font-size: 15px; margin: 0 0 10px 0;">
                                        If you have any questions, feel free to reach out to us at <a href="mailto:hiba@garudahacks.com" style="color: #F59E42; text-decoration: underline;">hiba@garudahacks.com</a>.
                                    </p>
                                    <p style="color: #fffbe6; font-size: 13px; margin: 0;">
                                        We hope to see you at Garuda Hacks 6.0!
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
                        <tr>
                            <td style="text-align: center; padding: 20px;">
                                <p style="color: #bfae6a; font-size: 12px; margin: 0 0 10px 0;">
                                    © 2025 Garuda Hacks. All rights reserved.
                                </p>
                                <p style="color: #d6c98a; font-size: 11px; margin: 0;">
                                    You received this email because you applied for Garuda Hacks 6.0.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
  `,
  text: `Your Garuda Hacks 6.0 Application Status: Waitlisted\n\nThank you for your interest in Garuda Hacks 6.0. At this time, you have been placed on our waitlist. Spots may open up as the event approaches, and we will notify you immediately if a spot becomes available.\n\nWe appreciate your patience and enthusiasm. Stay tuned for updates!\n\nIf you have any questions, feel free to reach out to us at hiba@garudahacks.com.\n\nWe hope to see you at Garuda Hacks 6.0!\n\n© 2025 Garuda Hacks. All rights reserved.\nYou received this email because you applied for Garuda Hacks 6.0.`,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, type, rsvpDeadline, teamDeadline, eventStartDate } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: "live.smtp.mailtrap.io",
      port: 587,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });

    let mailOptions;
    if (type === "rejected") {
      mailOptions = createRejectionMailOptions(email);
    } else if (type === "waitlisted") {
      mailOptions = createWaitlistedMailOptions(email);
    } else {
      if (!rsvpDeadline || !teamDeadline || !eventStartDate) {
        return NextResponse.json(
          { error: "Missing required parameters for acceptance email" },
          { status: 400 }
        );
      }
      mailOptions = createAcceptanceMailOptions(
        email,
        rsvpDeadline,
        teamDeadline,
        eventStartDate
      );
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Email sent successfully" });
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
