import { Resend } from "resend";
import { NextResponse } from "next/server";
import { ContactNotificationEmail } from "@/emails/contact-notification";
import { ContactConfirmationEmail } from "@/emails/contact-confirmation";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const { name, email, company, message } = await req.json();

    // Basic validation
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!resend) {
      console.warn("[Contact API] RESEND_API_KEY not set — email not sent.");
      // Signal the frontend to show a fallback mailto link instead of a success message
      return NextResponse.json({ fallback: true });
    }

    // Email to Pablo (lead notification)
    await resend.emails.send({
      from: "guillermo@dimeglio.dev",
      to: "dimeglio.pablo@gmail.com",
      replyTo: email.trim(),
      subject: `📬 New Lead: ${name.trim()}${company?.trim() ? ` @ ${company.trim()}` : ""}`,
      react: ContactNotificationEmail({
        name: name.trim(),
        email: email.trim(),
        company: company?.trim() || undefined,
        message: message?.trim() || undefined,
      }),
    });

    // Confirmation email to the visitor
    await resend.emails.send({
      from: "guillermo@dimeglio.dev",
      to: email.trim(),
      subject: `Got it — Pablo will be in touch soon`,
      react: ContactConfirmationEmail({ name: name.trim() }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contact API] Error:", error);
    // If Resend fails for any reason (template error, network, etc.), send the visitor
    // to the mailto fallback instead of showing a dead-end red error.
    return NextResponse.json({ fallback: true });
  }
}
