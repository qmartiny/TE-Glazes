import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

// Material 3 "outlined" text fields. The label floats onto the outline when
// the field has focus or a value (CSS does this via :placeholder-shown).

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  supportingText?: string;
};

export function TextField({ label, supportingText, required, ...props }: InputProps) {
  return (
    <div className="tf-wrap">
      <label className="tf">
        <input {...props} required={required} placeholder=" " />
        <span className="tf-label">
          {label}
          {required && ' *'}
        </span>
      </label>
      {supportingText && <span className="tf-supporting">{supportingText}</span>}
    </div>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  supportingText?: string;
};

export function TextArea({ label, supportingText, ...props }: TextAreaProps) {
  return (
    <div className="tf-wrap">
      <label className="tf tf-multiline">
        <textarea {...props} placeholder=" " />
        <span className="tf-label">{label}</span>
      </label>
      {supportingText && <span className="tf-supporting">{supportingText}</span>}
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

/** A native <select> dressed as an M3 outlined "exposed dropdown" (the phone's own picker opens). */
export function SelectField({ label, required, children, ...props }: SelectProps) {
  return (
    <label className="tf tf-select">
      <select {...props} required={required}>
        {children}
      </select>
      <span className="tf-label">
        {label}
        {required && ' *'}
      </span>
      <Icon name="arrow_drop_down" className="tf-trailing" />
    </label>
  );
}
