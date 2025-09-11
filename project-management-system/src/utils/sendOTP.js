import nodemailer from "nodemailer";
import pug from "pug";
import { htmlToText } from "html-to-text";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendOTP = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Render HTML based on a pug template
  const html = pug.renderFile(
    path.join(__dirname, `../views/emails/${options.template}.pug`),
    {
      firstName: options.firstName,
      subject: options.subject,
      otp: options.otp,
    }
  );

  // 3) Define the email options
  const mailOptions = {
    from: "Your App Name <no-reply@yourapp.com>",
    to: options.email,
    subject: options.subject,
    html,
    text: htmlToText(html),
  };

  // 4) Actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new InternalServerError(
      "There was an error sending the email. Try again later!"
    );
  }
};

export default sendOTP;
