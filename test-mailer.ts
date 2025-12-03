import * as dotenv from "dotenv";
dotenv.config();

import nodemailer from 'nodemailer';

async function testMailer() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log("Using host:", process.env.SMTP_HOST); // Debug

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello!</p>",
  });

  console.log("Sent:", info.messageId);
}

testMailer();
