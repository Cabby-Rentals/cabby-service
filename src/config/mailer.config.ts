import nodemailer from 'nodemailer';

export const mailSender = async (otpMessage) => {
  try {
    var transport = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.NODE_MAILER_USERNAME,
        pass: process.env.NODE_MAILER_PASSWORD,
      },
    });

    let info = await transport.sendMail(otpMessage);
    console.log('Email info: ', info);
    return info;
  } catch (error) {
    console.log(error.message);
  }
};
