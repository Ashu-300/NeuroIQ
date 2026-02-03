/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password validation (min 8 chars, at least 1 letter and 1 number)
 */
export const isValidPassword = (password) => {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
};

/**
 * Required field validation
 */
export const isRequired = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
};

/**
 * Form validation rules for React Hook Form
 */
export const validationRules = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
  },
  name: {
    required: 'Name is required',
    minLength: {
      value: 2,
      message: 'Name must be at least 2 characters',
    },
  },
  rollNo: {
    required: 'Roll number is required',
  },
  branch: {
    required: 'Branch is required',
  },
  semester: {
    required: 'Semester is required',
    min: {
      value: 1,
      message: 'Semester must be at least 1',
    },
    max: {
      value: 8,
      message: 'Semester cannot exceed 8',
    },
  },
};
