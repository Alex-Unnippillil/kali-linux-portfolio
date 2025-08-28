import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '../../ui/FormField';
import FormError from '../../ui/FormError';

export const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const sanitize = (str: string) =>
  str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Invalid name').max(100, 'Invalid name'),
  email: z.string().trim().email('Invalid email'),
  message: z.string().trim().min(1, 'Invalid message').max(1000, 'Invalid message'),
  honeypot: z.string().max(0),
});

export const processContactForm = async (
  data: { name: string; email: string; message: string; honeypot: string },
  fetchImpl: typeof fetch = fetch
) => {
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message };
  }
  const { name, email, message } = result.data;

  try {
    const res = await fetchImpl('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitize(name),
        email,
        message: sanitize(message),
        honeypot: '',
      }),
    });
    if (!res.ok) return { success: false, error: 'Submission failed' };
    return { success: true };
  } catch {
    return { success: false, error: 'Submission failed' };
  }
};

const ContactApp = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema) });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: z.infer<typeof contactSchema>) => {
    const result = await processContactForm(data);
    if (!result.success) {
      setError(result.error ? sanitize(result.error) : 'Submission failed');
      setSuccess(false);
    } else {
      setError('');
      setSuccess(true);
      reset();
    }
  };

  return (
    <div className="p-4 text-black">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <FormField id="contact-name" label="Name" error={errors.name?.message}>
          <input className="p-1 border" placeholder="Name" {...register('name')} />
        </FormField>
        <FormField id="contact-email" label="Email" error={errors.email?.message}>
          <input className="p-1 border" placeholder="Email" {...register('email')} />
        </FormField>
        <FormField id="contact-message" label="Message" error={errors.message?.message}>
          <textarea className="p-1 border" placeholder="Message" {...register('message')} />
        </FormField>
        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          {...register('honeypot')}
        />
        <button type="submit" className="bg-blue-500 text-white px-2 py-1">
          Send
        </button>
      </form>
      {error && <FormError>{error}</FormError>}
      {success && !error && (
        <div role="status" className="text-green-600 mt-2">
          Message sent!
        </div>
      )}
    </div>
  );
};

export default ContactApp;
