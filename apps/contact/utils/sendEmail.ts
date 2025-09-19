import emailjs from '@emailjs/browser';
import { clientEnv } from '../../../lib/env.client';

export interface EmailData {
  name: string;
  email: string;
  message: string;
}

let initialized = false;

export const sendEmail = async ({ name, email, message }: EmailData) => {
  const serviceId = clientEnv.NEXT_PUBLIC_SERVICE_ID || '';
  const templateId = clientEnv.NEXT_PUBLIC_TEMPLATE_ID || '';
  const userId = clientEnv.NEXT_PUBLIC_USER_ID || '';

  if (!initialized && userId) {
    try {
      emailjs.init(userId);
    } catch {
      /* ignore */
    }
    initialized = true;
  }

  return emailjs.send(serviceId, templateId, { name, email, message });
};

export default sendEmail;
