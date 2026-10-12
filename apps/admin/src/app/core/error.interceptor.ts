import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from './api.error';

// Turns every HTTP error into a simple ApiError with a readable message
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);

      const body = err.error as { error?: string; details?: Record<string, string[]> } | null;
      let message = body?.error ?? 'Something went wrong. Please try again.';
      if (body?.details) {
        const [field, errors] = Object.entries(body.details)[0] ?? [];
        if (field && errors?.length) message = `${field}: ${errors[0]}`;
      }
      if (err.status === 0) message = "Can't reach the API. Is it running on port 4000?";

      return throwError(() => new ApiError(err.status, message, err.error));
    }),
  );