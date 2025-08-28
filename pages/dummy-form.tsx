import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '../components/ui/FormField';
import FormError from '../components/ui/FormError';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Please enter a valid email'),
  message: z.string().trim().min(1, 'Message is required'),
});

type FormData = z.infer<typeof schema>;

const DummyForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const onSubmit = async (data: FormData) => {
    setSuccess(false);
    setServerError('');
    try {
      await fetch('/api/dummy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      setSuccess(true);
      reset();
    } catch {
      setServerError('Submission failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded bg-white p-6 shadow-md">
        <h1 className="mb-4 text-xl font-bold">Contact Us</h1>
        {serverError && <FormError className="mb-4 mt-0">{serverError}</FormError>}
        {success && <p className="mb-4 text-sm text-green-600">Form submitted successfully!</p>}
        <FormField id="name" label="Name" error={errors.name?.message}>
          <input className="w-full rounded border p-2" type="text" {...register('name')} />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <input className="w-full rounded border p-2" type="email" {...register('email')} />
        </FormField>
        <FormField id="message" label="Message" error={errors.message?.message}>
          <textarea className="w-full rounded border p-2" {...register('message')} />
        </FormField>
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Submit</button>
        <p className="mt-4 text-xs text-gray-500">
          This form posts to a dummy endpoint. No data is stored. By submitting, you consent to this temporary processing of your information.
        </p>
      </form>
    </div>
  );
};

export default DummyForm;
