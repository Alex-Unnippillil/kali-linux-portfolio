import emailjs from '@emailjs/browser';

export interface EmailData {
  name: string;
  email: string;
  message: string;
}

let initialized = false;

export const sendEmail = async ({ name, email, message }: EmailData) => {
  const serviceId = process.env.NEXT_PUBLIC_SERVICE_ID || '';
  const templateId = process.env.NEXT_PUBLIC_TEMPLATE_ID || '';
  const userId = process.env.NEXT_PUBLIC_USER_ID || '';

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
