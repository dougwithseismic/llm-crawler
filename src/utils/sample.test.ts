import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj).toMatchObject({ name: 'test' });
  });
});
