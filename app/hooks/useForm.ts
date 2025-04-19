'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (onSubmit: () => Promise<void>) => (e: FormEvent) => Promise<void>;
  setFieldValue: (name: string, value: any) => void;
  setFieldError: (name: string, error: string) => void;
  resetForm: () => void;
}

/**
 * Custom hook for form handling
 * @param initialValues - Initial form values
 * @returns Object containing form state and handlers
 */
export function useForm<T extends Record<string, any>>(initialValues: T): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFieldValue(name, value);
  };

  const setFieldValue = (name: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const setFieldError = (name: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = (onSubmit: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm
  };
}
