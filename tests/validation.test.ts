import { describe, it, expect } from 'vitest';
import {
    validateId,
    validateString,
    validateSearchQuery,
    sanitizeMetadata,
    validateRequired,
} from '../netlify/utils/validation.mjs';

describe('validateId', () => {
    it('returns parsed integer for valid ID', () => {
        expect(validateId('123')).toBe(123);
        expect(validateId('1')).toBe(1);
    });

    it('returns null for invalid IDs', () => {
        expect(validateId(null)).toBeNull();
        expect(validateId('')).toBeNull();
        expect(validateId('abc')).toBeNull();
        expect(validateId('0')).toBeNull();
        expect(validateId('-1')).toBeNull();
        expect(validateId('1.5')).toBeNull();
        expect(validateId('12abc')).toBeNull();
    });

    it('handles edge cases', () => {
        expect(validateId('999999999')).toBe(999999999);
        expect(validateId('  42  ')).toBeNull(); // No trimming for IDs
    });
});

describe('validateString', () => {
    it('returns trimmed string for valid input', () => {
        expect(validateString('hello')).toBe('hello');
        expect(validateString('  hello  ')).toBe('hello');
    });

    it('returns null for empty or invalid input', () => {
        expect(validateString(null)).toBeNull();
        expect(validateString(undefined)).toBeNull();
        expect(validateString('')).toBeNull();
        expect(validateString('   ')).toBeNull();
    });

    it('truncates strings exceeding maxLength', () => {
        expect(validateString('hello world', 5)).toBe('hello');
        expect(validateString('abc', 10)).toBe('abc');
    });

    it('uses default maxLength of 255', () => {
        const longString = 'a'.repeat(300);
        expect(validateString(longString)?.length).toBe(255);
    });
});

describe('validateSearchQuery', () => {
    it('returns sanitized query', () => {
        expect(validateSearchQuery('alocasia')).toBe('alocasia');
        expect(validateSearchQuery('  monstera  ')).toBe('monstera');
    });

    it('returns empty string for invalid input', () => {
        expect(validateSearchQuery(null)).toBe('');
        expect(validateSearchQuery('')).toBe('');
    });

    it('removes dangerous characters', () => {
        expect(validateSearchQuery('plant<script>')).toBe('plantscript');
        expect(validateSearchQuery('test&param=1')).toBe('testparam1');
    });

    it('allows safe characters for plant names', () => {
        expect(validateSearchQuery("Bird's Nest")).toBe("Bird's Nest");
        expect(validateSearchQuery('Alocasia-hybrid')).toBe('Alocasia-hybrid');
    });

    it('truncates long queries', () => {
        const longQuery = 'a'.repeat(150);
        expect(validateSearchQuery(longQuery).length).toBe(100);
    });
});

describe('sanitizeMetadata', () => {
    it('returns valid metadata object', () => {
        const metadata = { care: { water: 'weekly' } };
        expect(sanitizeMetadata(metadata)).toEqual(metadata);
    });

    it('returns null for invalid input', () => {
        expect(sanitizeMetadata(null)).toBeNull();
        expect(sanitizeMetadata(undefined)).toBeNull();
        expect(sanitizeMetadata('string')).toBeNull();
        expect(sanitizeMetadata(123)).toBeNull();
    });

    it('returns null for arrays', () => {
        expect(sanitizeMetadata([1, 2, 3])).toBeNull();
    });

    it('returns null for oversized metadata', () => {
        const largeMetadata = { data: 'x'.repeat(20000) };
        expect(sanitizeMetadata(largeMetadata)).toBeNull();
    });

    it('respects custom size limit', () => {
        const metadata = { data: 'x'.repeat(100) };
        expect(sanitizeMetadata(metadata, 50)).toBeNull();
        expect(sanitizeMetadata(metadata, 200)).not.toBeNull();
    });
});

describe('validateRequired', () => {
    it('returns valid for complete body', () => {
        const body = { name: 'Plant', id: 1 };
        const result = validateRequired(body, ['name', 'id']);
        expect(result.valid).toBe(true);
        expect(result.missing).toEqual([]);
    });

    it('returns invalid with missing fields', () => {
        const body = { name: 'Plant' };
        const result = validateRequired(body, ['name', 'id', 'type']);
        expect(result.valid).toBe(false);
        expect(result.missing).toEqual(['id', 'type']);
    });

    it('treats empty strings as missing', () => {
        const body = { name: '' };
        const result = validateRequired(body, ['name']);
        expect(result.valid).toBe(false);
        expect(result.missing).toEqual(['name']);
    });

    it('treats null as missing', () => {
        const body = { name: null };
        const result = validateRequired(body, ['name']);
        expect(result.valid).toBe(false);
    });
});
