'use client';

import { useState } from 'react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  minLength,
  required = false,
}: PasswordInputProps) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        required={required}
        className="w-full bg-[#1a2535] border border-white/10 rounded-lg px-4 py-2 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa]"
      />
      <button
        type="button"
        onClick={() => setShown(value => !value)}
        className="absolute inset-y-0 right-2 my-1 px-2 rounded text-xs font-semibold text-gray-400 hover:text-[#00d4aa] hover:bg-white/5 transition"
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
