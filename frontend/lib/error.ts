import { AxiosError } from 'axios';

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((e: { msg: string }) => e.msg).join(', ');
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
