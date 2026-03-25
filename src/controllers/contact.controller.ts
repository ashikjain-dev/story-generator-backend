import { Request, Response } from 'express';
import { sendContactConfirmationEmail, sendContactEmail } from '../services/contact.service';

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;

const ALLOWED_TOPICS = new Set<string>([
  'support',
  'collaboration/partnerships',
  'Other',
]);

const containsHeaderNewline = (value: string): boolean => /[\r\n]/.test(value);

// Prevent header injection when values are used inside email headers (subject / replyTo / etc).
const stripHeaderNewlines = (value: string): string => value.replace(/[\r\n]/g, '').trim();

const isValidEmail = (value: string): boolean => {
  // Simple server-side check (enough for form submission use); keeps us dependency-free.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const createContact = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown> | undefined;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      status: 'Error',
      message: 'Invalid request body.',
    });
    return;
  }

  const rawName = body.name;
  const rawEmail = body.email;
  const rawTopic = body.topic;
  const rawMessage = body.message;

  if (rawEmail === undefined || typeof rawEmail !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: '`email` is required and must be a string.',
    });
    return;
  }

  if (rawTopic === undefined || typeof rawTopic !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: '`topic` is required and must be a string.',
    });
    return;
  }

  if (rawMessage === undefined || typeof rawMessage !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: '`message` is required and must be a string.',
    });
    return;
  }

  // Header safety checks (reject rather than trying to “fix” in most cases).
  if (containsHeaderNewline(rawEmail)) {
    res.status(400).json({
      status: 'Error',
      message: '`email` contains invalid characters.',
    });
    return;
  }
  if (containsHeaderNewline(rawTopic)) {
    res.status(400).json({
      status: 'Error',
      message: '`topic` contains invalid characters.',
    });
    return;
  }

  const name =
    rawName === undefined
      ? undefined
      : typeof rawName === 'string'
        ? stripHeaderNewlines(rawName).slice(0, MAX_NAME_LENGTH) || undefined
        : undefined;

  if (rawName !== undefined && typeof rawName !== 'string') {
    res.status(400).json({
      status: 'Error',
      message: '`name` must be a string when provided.',
    });
    return;
  }

  const email = stripHeaderNewlines(rawEmail);
  if (email.length > MAX_EMAIL_LENGTH || !isValidEmail(email)) {
    res.status(400).json({
      status: 'Error',
      message: '`email` must be a valid email address.',
    });
    return;
  }

  const topic = stripHeaderNewlines(rawTopic);
  if (!ALLOWED_TOPICS.has(topic)) {
    res.status(400).json({
      status: 'Error',
      message: '`topic` is invalid.',
    });
    return;
  }

  const message = rawMessage.trim();
  if (message.length === 0) {
    res.status(400).json({
      status: 'Error',
      message: '`message` cannot be empty.',
    });
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      status: 'Error',
      message: `\`message\` must be at most ${MAX_MESSAGE_LENGTH} characters long.`,
    });
    return;
  }

  const sessionId = typeof (req as any).sessionId === 'string' ? (req as any).sessionId : undefined;

  try {
    await sendContactEmail({
      name,
      email,
      topic,
      message,
      sessionId
    });

    // Fire-and-forget confirmation: if it fails, we still return 201 to the user.
    void sendContactConfirmationEmail({
      name,
      email,
      topic,
    }).catch((error) => {
      console.error('[contact-controller]: Confirmation send failed', error);
    });

    res.status(201).json({
      status: 'OK',
      message: 'Contact request sent successfully.',
    });
  } catch (error: any) {
    console.error('[contact-controller]: Send Error', error);
    res.status(500).json({
      status: 'Error',
      message: 'We could not send your message right now. Please try again in a moment.',
    });
  }
};

