import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const from = process.env.MAIL_FROM;

  if (!from) {
    throw new Error("MAIL_FROM no definido");
  }

  if (process.env.NODE_ENV !== "production") {
    await transporter.verify();
  }

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}