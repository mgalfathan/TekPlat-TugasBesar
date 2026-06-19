'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  id,
  name,
  autoComplete,
  placeholder = 'Password',
  minLength,
  required = false,
}: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="h-12 w-full rounded-chip border border-border-2 bg-bg px-4 pr-[72px] text-sm text-ink outline-none transition-colors placeholder:text-muted-2 hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/20"
      />
      <button
        type="button"
        onClick={() => setShown(value => !value)}
        className="absolute inset-y-0 right-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-lime"
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
