import React, { useState } from 'react';

interface ApiKeyInputProps {
  keyName: string;
  label: string;
  onSave: (key: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ keyName, label, onSave }) => {
  const [key, setKey] = useState('');

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-slate-900">{label} Required</h2>
        <p className="text-slate-600 mb-6">
          The {label} is missing or invalid. Please enter your key below to continue.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg mb-4"
          placeholder={`Enter your ${label}`}
        />
        <button
          onClick={() => onSave(key)}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
        >
          Save Key
        </button>
      </div>
    </div>
  );
};
