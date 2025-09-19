import emailjs from '@emailjs/browser';
import { EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, EMAIL_USER_ID } from '@/env.client';

export interface EmailData {
  name: string;
  email: string;
  message: string;
}

let initialized = false;

export const sendEmail = async ({ name, email, message }: EmailData) => {
  const serviceId = EMAIL_SERVICE_ID;
  const templateId = EMAIL_TEMPLATE_ID;
  const userId = EMAIL_USER_ID;

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
