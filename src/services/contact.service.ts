import nodemailer from 'nodemailer';

export interface ContactEmailInput {
  name?: string;
  email: string;
  topic: string;
  message: string;
  sessionId?: string;
}

const getEnvOrThrow = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not defined in environment.`);
  }
  return value;
};

const buildEmailText = (input: ContactEmailInput): string => {
  return [
    'New contact request',
    '',
    `Topic: ${input.topic}`,
    `Name: ${input.name || 'N/A'}`,
    `Email: ${input.email}`,
    '',
    'Message:',
    input.message,
    `Session ID: ${input.sessionId || 'N/A'}`,
  ].join('\n');
};

export const sendContactEmail = async (input: ContactEmailInput): Promise<void> => {
  try {
    const emailUser = getEnvOrThrow('EMAIL_USER');
    const emailPass = getEnvOrThrow('EMAIL_PASS');
    const toEmail = process.env.CONTACT_TO_EMAIL || emailUser;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: emailUser,
      to: toEmail,
      replyTo: input.email,
      subject: `Contact Us - ${input.topic}`,
      text: buildEmailText(input),
    });
    
  } catch (error: any) {
    console.error('[contact-service]: sendContactEmail failed', error);
    throw error;
  }
};

export interface ContactConfirmationInput {
  name?: string;
  email: string;
  topic: string;
}

export const sendContactConfirmationEmail = async (
  input: ContactConfirmationInput
): Promise<void> => {
  try {
    const emailUser = getEnvOrThrow('EMAIL_USER');
    const emailPass = getEnvOrThrow('EMAIL_PASS');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const subject = 'We received your message 🎉';
    const namePart = input.name ? `, ${input.name}` : '';

    await transporter.sendMail({
      from: emailUser,
      to: input.email,
      subject,
      text: [
        `Hi${namePart} 👋`,
        '',
        '✅ Thanks for reaching out!',
        'We’ve received your message and our team will get back to you soon.',
        '',
        `📌 Topic: ${input.topic}`,
        '',
        '— Regards,',
        'StoryGen Team ✨',
      ].join('\n'),
    });
  } catch (error: any) {
    console.error('[contact-service]: sendContactConfirmationEmail failed', error);
    throw error;
  }
};

