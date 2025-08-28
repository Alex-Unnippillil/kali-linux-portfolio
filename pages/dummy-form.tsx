import React, { useState } from 'react';
import { z } from 'zod';
import FormError from '../components/ui/FormError';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  message: z.string().min(1, 'Message is required'),
});

type Errors = {
  name?: string;
  email?: string;
  message?: string;
};

const DummyForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ name, email, message });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        message: fieldErrors.message?.[0],
      });
      return;
    }

    setErrors({});
    setSuccess(false);

    await fetch('/api/dummy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, message }),
    });

    setSuccess(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <label className="mb-2 block text-sm font-medium" htmlFor="name">Name</label>
        <input
          id="name"
          className="w-full rounded border p-2"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
        />
        {errors.name && <FormError>{errors.name}</FormError>}
        <label className="mb-2 mt-4 block text-sm font-medium" htmlFor="email">Email</label>
        <input
          id="email"
          className="w-full rounded border p-2"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />
        {errors.email && <FormError>{errors.email}</FormError>}
        <label className="mb-2 mt-4 block text-sm font-medium" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="w-full rounded border p-2"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
          }}
        />
        {errors.message && <FormError>{errors.message}</FormError>}
        <button type="submit" className="mt-4 w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
