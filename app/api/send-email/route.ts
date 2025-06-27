import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface MailOptions {
  from: string | { name: string; address: string };
  to: string;
  subject: string;
  html: string;
  text: string;
}

const createAcceptanceMailOptions = (email: string): MailOptions => ({
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
    <body style="margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff; min-height: 100vh;">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <!-- Email Content Container -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="800" style="max-width: 800px; background: linear-gradient(135deg, #1e40af 0%, #3730a3 25%, #7c3aed 75%, #a855f7 100%); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <!-- Header Section -->
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                <h1 style="color: white; font-size: 48px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.1;">
                                    Garuda Hacks <span style="background-color: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 8px; font-size: 40px; vertical-align: middle;">6.0</span>
                                </h1>
                                <p style="color: #EC4899; font-size: 18px; font-weight: 600; margin: 0; letter-spacing: 0.5px;">
                                    24 - 26 July 2025
                                </p>
                            </td>
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
                                        On behalf of the entire Garuda Hacks team, we're excited to welcome you to <strong>Garuda Hacks 6.0</strong>, happening from <strong>24 to 26 July 2025</strong> at <strong>Universitas Multimedia Nusantara (UMN)</strong>. We're so glad to have you on board.
                                    </p>
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                                        This year's event is proudly presented in collaboration with <strong>Himpunan Mahasiswa Informatika Universitas Multimedia Nusantara (HMIF UMN)</strong>, who have graciously offered their beautiful campus and full support to ensure a smooth and enjoyable experience for all participants. </p>
                                        <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                This year is an exciting time to be joining Garuda Hacks. When we began planning for this year's event, we collected feedback from previous years and decided to focus on the participant experience. From a career fair and a networking lunch, to a live judging round with VCs and a revamped application portal, we are determined to make this year our most engaging event yet. We hope that you will enjoy the experience.
                </p>
                <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                At the same time, we understand the world is going through challenging times. In moments of uncertainty, it is often the smallest communities that feel the greatest impact. We hope this event will be a space for you to build, connect, and be reminded of our shared mission as creators: to drive meaningful impact within our communities. We hope that this motivation will empower you to consistently think about what you can do to serve people and drive positive and lasting change for them.

                                </p>
                                </div>
                                
                                <!-- Event Details -->
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                    <h3 style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
                                        📅  Event Details
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
                                            <td style="color: white; font-size: 14px; padding: 8px 0; font-weight: 500;">30 Hours Hacking Period and Finalist Demo Day</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- Next Steps -->
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                                    <h3 style="color: white; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
                                        🚀 Action Items
                                    </h3>
                                    <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                                        <li style="margin-bottom: 10px;">RSVP on Portal to confirm your participation at <a href="https://portal.garudahacks.com/" style="color: white; text-decoration: underline;">portal.garudahacks.com</a></li>
                                        <li style="margin-bottom: 10px;">If you're under 18, sign and upload the Underage Consent Form on the RSVP Portal</li>
                                        <li style="margin-bottom: 10px;">
                                            Join our Discord community for updates and networking: 
                                            <a href="https://discord.gg/vQw3UeYzFb" style="color: white; text-decoration: underline;">discord.gg/vQw3UeYzFb</a>
                                        </li>
                                        <li style="margin-bottom: 10px;">Follow @<a href="https://www.instagram.com/garudahacks" style="color: white; text-decoration: underline;">garudahacks</a> on Instagram for latest updates</li>
                                        <li style="margin-bottom: 10px;">Add the official Garuda Hacks 6.0 Twibbon to your social media: <a href="https://twibbo.nz/garudahacks6" style="color: white; text-decoration: underline;">twibbo.nz/garudahacks6</a></li>
                                        <li style="margin-bottom: 10px;">Prepare your development environment and tools</li>
                                        <li style="margin-bottom: 10px;">Attend our technical meeting and speed dating sessions (details on Discord & Instagram)</li>
                                        <li>Mark your calendar and get ready to hack!</li>
                                    </ul>
                                </div>
                                
                                <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px 25px 20px 25px; margin-bottom: 30px;">
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 20px 0 20px 0; text-align: center;">
                                        Once again, on behalf of the entire Garuda Hacks committee, sponsors, and partners, <strong>WELCOME!</strong> We cannot wait to see what you will create!
                                    </p>
                                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                                        Maria Gracia Athalia & Dominic Kartadjoemena<br>
                                        Co-Managing Directors, Garuda Hacks 6.0
                                    </p>                               
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
                                                <a href="https://garudahq.notion.site/garudahacks-6-0-handbook" style="display: inline-block; background-color: transparent; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 2px solid rgba(255,255,255,0.3);">
                                                    View Handbook
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- Contact Info -->
                                <div style="text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                                    <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 10px 0;">
                                        Questions? Contact us at <a href="mailto:hiba@garudahacks.com" style="color: #fff; text-decoration: underline; text-decoration-color: #EC4899;">hiba@garudahacks.com</a>
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
                                <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 10px 0;">
                                    © 2025 Garuda Hacks. All rights reserved.
                                </p>
                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0;">
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
On behalf of the entire Garuda Hacks team, we're excited to welcome you to Garuda Hacks 6.0, happening from 24 to 26 July 2025 at Universitas Multimedia Nusantara (UMN). We're so glad to have you on board.

This year's event is proudly presented in collaboration with Himpunan Mahasiswa Informatika Universitas Multimedia Nusantara (HMIF UMN), who have graciously offered their beautiful campus and full support to ensure a smooth and enjoyable experience for all participants.

This year is an exciting time to be joining Garuda Hacks. When we began planning for this year's event, we collected feedback from previous years and decided to focus on the participant experience. From a career fair and a networking lunch, to a live judging round with VCs and a revamped application portal, we are determined to make this year our most engaging event yet. We hope that you will enjoy the experience.

At the same time, we understand the world is going through challenging times. In moments of uncertainty, it is often the smallest communities that feel the greatest impact. We hope this event will be a space for you to build, connect, and be reminded of our shared mission as creators: to drive meaningful impact within our communities. We hope that this motivation will empower you to consistently think about what you can do to serve people and drive positive and lasting change for them.

---

EVENT DETAILS
- Date: July 24 - 26, 2025
- Location: Universitas Multimedia Nusantara (UMN)
- Duration: 30 Hours Hacking Period and Finalist Demo Day

---

ACTION ITEMS
1. RSVP on Portal to confirm your participation: https://portal.garudahacks.com/
2. If you're under 18, sign and upload the Underage Consent Form on the RSVP Portal
3. Join our Discord community for updates and networking: https://discord.gg/vQw3UeYzFb
4. Follow @garudahacks on Instagram for latest updates: https://www.instagram.com/garudahacks
5. Add the official Garuda Hacks 6.0 Twibbon to your social media: https://twibbo.nz/garudahacks6
6. Prepare your development environment and tools
7. Attend our technical meeting and speed dating sessions (details on Discord & Instagram)
8. Mark your calendar and get ready to hack!

---

Once again, on behalf of the entire Garuda Hacks committee, sponsors, and partners, WELCOME! We cannot wait to see what you will create!

Maria Gracia Athalia & Dominic Kartadjoemena
Co-Managing Directors, Garuda Hacks 6.0

Questions? Contact us at hiba@garudahacks.com
Follow us on social media for the latest updates.

© 2025 Garuda Hacks. All rights reserved.
You received this email because you applied for Garuda Hacks 6.0.
`,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const { email, type } = body;

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
      mailOptions = createAcceptanceMailOptions(email);
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
