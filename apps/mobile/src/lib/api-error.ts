import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join('\n');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (!error.response) {
    return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجدداً.';
  }

  return fallback;
}
