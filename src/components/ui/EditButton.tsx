import React from 'react';
import { Edit2 } from 'lucide-react';
import { useEditModal } from '../../contexts/EditModalContext';

export interface EditButtonProps {
  data: any;
  entityType: string;
  entityId: string;
  label?: string;
  className?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const EditButton: React.FC<EditButtonProps> = ({
  data,
  entityType,
  entityId,
  label = 'Edit',
  className = '',
  buttonSize = 'md',
  variant = 'secondary',
}) => {
  const { openEditor } = useEditModal();

  const handleClick = () => {
    openEditor(data, entityType, entityId, `Edit ${entityType}`);
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    ghost: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2 rounded-lg transition-colors font-medium
        ${sizeClasses[buttonSize]}
        ${variantClasses[variant]}
        ${className}
      `}
      title={`Edit ${entityType}`}
    >
      <Edit2 size={buttonSize === 'sm' ? 14 : buttonSize === 'md' ? 16 : 20} />
      {label}
    </button>
  );
};
