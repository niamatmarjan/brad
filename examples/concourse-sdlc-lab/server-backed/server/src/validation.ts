import { fail } from './errors.js';
import type { Input } from './model.js';

export function object(value: unknown): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(400, 'INVALID_INPUT', 'A JSON object is required.');
  }
  return value as Input;
}
export function fields(input: Input, allowed: readonly string[]): void {
  const unknown = Object.keys(input).filter(key => !allowed.includes(key));
  if (unknown.length) fail(400, 'INVALID_INPUT', 'Unknown fields.', { fields: unknown });
}
export function text(value: unknown, field: string, max = 4000, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max) {
    fail(400, 'INVALID_INPUT', `${field} must be ${empty ? 'a' : 'a non-empty'} string of at most ${max} characters.`, { field });
  }
  return value.trim();
}
export function choice<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (typeof value !== 'string' || !options.includes(value as T)) {
    fail(400, 'INVALID_INPUT', `${field} must be one of: ${options.join(', ')}.`, { field });
  }
  return value as T;
}
export function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 100) fail(400, 'INVALID_INPUT', `${field} must be an array of at most 100 strings.`);
  const result = value.map(entry => text(entry, field, 2000));
  if (new Set(result).size !== result.length) fail(400, 'INVALID_INPUT', `${field} must not contain duplicates.`);
  return result;
}
export function estimate(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10000) {
    fail(400, 'INVALID_INPUT', 'estimate must be null or a number between 0 and 10000.');
  }
  return value;
}
export function version(value: unknown, current: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail(400, 'INVALID_INPUT', 'expectedVersion must be a positive integer.');
  if (value !== current) fail(409, 'VERSION_CONFLICT', 'This record changed. Refresh and try again.', { expectedVersion: value, currentVersion: current });
  return current;
}
