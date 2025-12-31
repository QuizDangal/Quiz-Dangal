// Validation utilities for security and data integrity

import { PASSWORD_MIN_LENGTH } from '@/constants';

/**
 * Validate if a string is a valid UUID v4
 * @param {string} value - The value to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
export function isValidUUID(value) {
  if (!value || typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {Object} - { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required.' };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.` };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long (max 128 characters).' };
  }
  
  // Check for basic complexity (at least one letter and one number recommended)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { 
      valid: false, 
      message: 'Password should contain at least one letter and one number.' 
    };
  }
  
  return { valid: true, message: '' };
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Practical email validator for public apps:
  // - requires at least one dot in the domain
  // - avoids overly-permissive patterns that accept "user@localhost"
  // - keeps max length guard
  const e = email.trim();
  if (e.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;
  return emailRegex.test(e);
}

/**
 * Sanitize string for safe display (basic XSS prevention)
 * @param {string} str - The string to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return String(str)
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate phone number (India format)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid Indian phone number
 */
export function isValidIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  // Indian mobile numbers: 10 digits starting with 6-9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Validate URL format
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
