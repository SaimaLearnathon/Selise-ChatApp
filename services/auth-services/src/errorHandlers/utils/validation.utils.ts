// Simple validation without external deps — swap with zod/joi if preferred

export interface ValidationError {
  field: string;
  message: string;
}

export const validateRegisterInput = (
  email: unknown,
  password: unknown
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (typeof password !== 'string' || !password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain uppercase, lowercase, and a number',
    });
  }

  return errors;
};

export const validateLoginInput = (
  email: unknown,
  password: unknown
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (typeof email !== 'string' || !email.trim())
    errors.push({ field: 'email', message: 'Email is required' });

  if (typeof password !== 'string' || !password)
    errors.push({ field: 'password', message: 'Password is required' });

  return errors;
};