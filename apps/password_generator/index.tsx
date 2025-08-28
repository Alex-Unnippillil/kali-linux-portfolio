import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '../../components/ui/FormField';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

interface PasswordGeneratorProps {
  getDailySeed?: () => Promise<string>;
}

const schema = z
  .object({
    length: z
      .number({ invalid_type_error: 'Length must be a number' })
      .min(4, 'Length must be at least 4')
      .max(64, 'Length must be at most 64'),
    useLower: z.boolean(),
    useUpper: z.boolean(),
    useNumbers: z.boolean(),
    useSymbols: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!(data.useLower || data.useUpper || data.useNumbers || data.useSymbols)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one character type',
        path: ['useLower'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ getDailySeed }) => {
  void getDailySeed;
  const [password, setPassword] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      length: 12,
      useLower: true,
      useUpper: true,
      useNumbers: true,
      useSymbols: false,
    },
  });

  const onSubmit = (data: FormValues) => {
    let chars = '';
    if (data.useLower) chars += LOWER;
    if (data.useUpper) chars += UPPER;
    if (data.useNumbers) chars += NUMS;
    if (data.useSymbols) chars += SYMBOLS;
    if (!chars) {
      setPassword('');
      return;
    }
    let pwd = '';
    for (let i = 0; i < data.length; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      pwd += chars[idx];
    }
    setPassword(pwd);
  };

  const length = watch('length');
  const useLower = watch('useLower');
  const useUpper = watch('useUpper');
  const useNumbers = watch('useNumbers');
  const useSymbols = watch('useSymbols');

  const strengthInfo = () => {
    const types = [useLower, useUpper, useNumbers, useSymbols].filter(Boolean).length;
    let score = 0;
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    score += types - 1; // 0-3
    if (score <= 1) return { label: 'Weak', width: '33%', color: 'bg-red-500' };
    if (score === 2) return { label: 'Medium', width: '66%', color: 'bg-yellow-500' };
    return { label: 'Strong', width: '100%', color: 'bg-green-500' };
  };

  const { label, width, color } = strengthInfo();

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard?.writeText(password);
    } catch (e) {
      // ignore
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4"
    >
      <FormField error={errors.length?.message}>
        <label htmlFor="length" className="mr-2">Length:</label>
        <input
          id="length"
          type="number"
          min={4}
          max={64}
          className="text-black px-2"
          {...register('length', { valueAsNumber: true })}
        />
      </FormField>
      <FormField error={errors.useLower?.message} className="flex flex-col space-y-1">
        <label><input type="checkbox" {...register('useLower')} /> Lowercase</label>
        <label><input type="checkbox" {...register('useUpper')} /> Uppercase</label>
        <label><input type="checkbox" {...register('useNumbers')} /> Numbers</label>
        <label><input type="checkbox" {...register('useSymbols')} /> Symbols</label>
      </FormField>
      <div className="flex space-x-2 items-center">
        <input
          data-testid="password-display"
          type="text"
          readOnly
          value={password}
          className="flex-1 text-black px-2 py-1 font-mono leading-[1.2] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-3 py-1 bg-blue-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          Copy
        </button>
      </div>
      <div>
        <div className="h-2 w-full bg-gray-700 rounded">
          <div className={`h-full ${color} rounded`} style={{ width }} />
        </div>
        <div className="text-sm mt-1">Strength: {label}</div>
      </div>
      <div className="mt-auto">
        <button
          type="submit"
          disabled={!isValid}
          className="w-full px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Generate
        </button>
      </div>
    </form>
  );
};

export default PasswordGenerator;
