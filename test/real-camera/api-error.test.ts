import { describe, it, expect } from 'vitest';
import { ApiError } from '../../src/index.js';

describe('ApiError', () => {
    it('maps INTERNAL_ERROR to the correct label', () => {
        const err = new ApiError(ApiError.Code.INTERNAL_ERROR);
        expect(err.identifier).toBe(ApiError.Code.INTERNAL_ERROR);
        expect(err.label).toBe('INTERNAL_ERROR');
        expect(err.toJSON()).toBeDefined();
    });

    it('maps COMM_DISCONNECTED to the correct label', () => {
        const err = new ApiError(ApiError.Code.COMM_DISCONNECTED);
        expect(err.label).toBe('COMM_DISCONNECTED');
    });

    it('maps INVALID_HANDLE to the correct label', () => {
        const err = new ApiError(ApiError.Code.INVALID_HANDLE);
        expect(err.label).toBe('INVALID_HANDLE');
    });

    it('maps OBJECT_NOTREADY to the correct label', () => {
        const err = new ApiError(ApiError.Code.OBJECT_NOTREADY);
        expect(err.label).toBe('OBJECT_NOTREADY');
    });
});
