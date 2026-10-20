export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) { super(message); }
}
export function fail(status: number, code: string, message: string, details: unknown = null): never {
  throw new ApiError(status, code, message, details);
}
