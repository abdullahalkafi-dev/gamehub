export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}
export const badRequest = (code: string, msg?: string) => new AppError(400, code, msg);
export const unauthorized = (code = 'unauthorized', msg?: string) => new AppError(401, code, msg);
export const forbidden = (code = 'forbidden', msg?: string) => new AppError(403, code, msg);
export const notFound = (code = 'not_found', msg?: string) => new AppError(404, code, msg);
export const conflict = (code: string, msg?: string) => new AppError(409, code, msg);
