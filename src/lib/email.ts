import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@dsd7.go.th",
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export function buildRequestEmailHtml(data: {
  requesterName: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  actionUrl: string;
  statusMessage: string;
}) {
  return `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e40af;">ระบบขอใช้รถยนต์ราชการ</h2>
      <h3>สถาบันพัฒนาฝีมือแรงงาน 7 อุบลราชธานี</h3>
      <hr/>
      <p><strong>${data.statusMessage}</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; font-weight: bold;">ผู้ขอ:</td><td style="padding: 8px;">${data.requesterName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">สถานที่:</td><td style="padding: 8px;">${data.destination}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">วัตถุประสงค์:</td><td style="padding: 8px;">${data.purpose}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">วันเวลาออก:</td><td style="padding: 8px;">${data.departureDate}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">วันเวลากลับ:</td><td style="padding: 8px;">${data.returnDate}</td></tr>
      </table>
      <br/>
      <a href="${data.actionUrl}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">ดูรายละเอียด</a>
    </div>
  `;
}
