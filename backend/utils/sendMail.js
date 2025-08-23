import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'arvindhshankar98@gmail.com',
    pass: 'ecgo dibn kfut tywm', // App password
  },
});

const sendMail = async ({ to, subject, text }) => {
const mailOptions = {
  from: 'arvindhshankar98@gmail.com',
  to,
  subject,
  text,
  replyTo: 'arvindhshankar98@gmail.com',
  headers: {
    'X-Laziness-level': 1000,
    'X-Content-Type-Options': 'nosniff'
  }
};


  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error);
  }
};

export default sendMail;
