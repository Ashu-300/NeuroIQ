import { ROLES } from './constants';

/**
 * Check if user has admin role
 */
export const isAdmin = (role) => role === ROLES.ADMIN;

/**
 * Check if user has teacher role
 */
export const isTeacher = (role) => role === ROLES.TEACHER;

/**
 * Check if user has student role
 */
export const isStudent = (role) => role === ROLES.STUDENT;

/**
 * Get role display name
 */
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.TEACHER]: 'Teacher',
    [ROLES.STUDENT]: 'Student',
  };
  return displayNames[role] || 'Unknown';
};

/**
 * Get dashboard path based on role
 */
export const getDashboardPath = (role) => {
  const paths = {
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.TEACHER]: '/teacher/dashboard',
    [ROLES.STUDENT]: '/student/dashboard',
  };
  return paths[role] || '/';
};
