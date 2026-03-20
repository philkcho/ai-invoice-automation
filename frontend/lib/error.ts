import { AxiosError } from 'axios';

export function getErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    // 커스텀 validation 에러 포맷: { detail: "Validation error", errors: [...] }
    if (data?.errors && Array.isArray(data.errors)) {
      const messages = data.errors.map((e: { field?: string; message: string }) => {
        const field = e.field?.replace('body.', '') ?? '';
        return field ? `${field}: ${e.message}` : e.message;
      });
      return messages.join(', ');
    }
    const detail = data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((e: { msg: string }) => e.msg).join(', ');
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
