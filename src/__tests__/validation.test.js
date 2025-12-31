import { describe, it, expect } from 'vitest';
import { PASSWORD_MIN_LENGTH } from '@/constants';
import { 
  isValidUUID, 
  validatePassword, 
  isValidEmail, 
  sanitizeString,
  isValidIndianPhone,
  isValidURL 
} from '@/lib/validation';

describe('validation utilities', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // too short
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should accept passwords with special characters', () => {
      const result = validatePassword('Pass@word123!');
      expect(result.valid).toBe(true);
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain(`${PASSWORD_MIN_LENGTH} characters`);
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('letter and one number');
    });

    it('should reject passwords without letters', () => {
      const result = validatePassword('12345678');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('letter and one number');
    });

    it('should reject empty passwords', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should reject overly long passwords', () => {
      const longPassword = 'a'.repeat(130) + '1';
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too long');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user+tag@domain.co.in')).toBe(true);
      expect(isValidEmail('user123@test-domain.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove angle brackets', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
    });

    it('should limit length to 1000 chars', () => {
      const longString = 'a'.repeat(1500);
      expect(sanitizeString(longString).length).toBe(1000);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('isValidIndianPhone', () => {
    it('should validate correct Indian phone numbers', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('8123456789')).toBe(true);
      expect(isValidIndianPhone('7000000000')).toBe(true);
      expect(isValidIndianPhone('6999999999')).toBe(true);
    });

    it('should accept numbers with spaces', () => {
      expect(isValidIndianPhone('98765 43210')).toBe(true);
      expect(isValidIndianPhone('9876 543 210')).toBe(true);
    });

    it('should reject invalid Indian phone numbers', () => {
      expect(isValidIndianPhone('5876543210')).toBe(false); // starts with 5
      expect(isValidIndianPhone('987654321')).toBe(false); // too short
      expect(isValidIndianPhone('98765432100')).toBe(false); // too long
      expect(isValidIndianPhone('')).toBe(false);
      expect(isValidIndianPhone('abcdefghij')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://test.com/path?query=value')).toBe(true);
      expect(isValidURL('https://sub.domain.com:8080/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('ftp://example.com')).toBe(false); // ftp not allowed
      expect(isValidURL('javascript:alert(1)')).toBe(false);
      expect(isValidURL('')).toBe(false);
      expect(isValidURL(null)).toBe(false);
    });
  });
});
