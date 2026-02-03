import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { signup as signupApi } from '../../api/auth.api';
import { ROLES } from '../../utils/constants';
import { Button, Input, Select } from '../../components/ui';
import { Card } from '../../components/ui';

const roleOptions = [
  { value: ROLES.TEACHER, label: 'Teacher' },
  { value: ROLES.ADMIN, label: 'Administrator' },
  { value: ROLES.STUDENT, label: 'Student' },
];

const SignupPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setError('');
    setIsLoading(true);

    try {
      // Backend expects: name, email, password, role, institution
      await signupApi({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        institution: data.institution,
      });

      // Redirect to login with success message
      navigate('/login', {
        state: { message: 'Account created successfully. Please sign in.' },
      });
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
        <p className="text-gray-500 mt-2">Get started with NeuroIQ</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register('name', {
            required: 'Name is required',
            minLength: {
              value: 3,
              message: 'Name must be at least 3 characters',
            },
          })}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email',
            },
          })}
        />

        <Input
          label="Institution"
          type="text"
          placeholder="University / College name"
          error={errors.institution?.message}
          {...register('institution', {
            required: 'Institution is required',
          })}
        />

        <Select
          label="Role"
          options={roleOptions}
          error={errors.role?.message}
          {...register('role', {
            required: 'Please select a role',
          })}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />

        <Button type="submit" fullWidth loading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
          Sign in
        </Link>
      </p>
    </Card>
  );
};

export default SignupPage;
