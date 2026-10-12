import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

function withToken(req: HttpRequest<unknown>, token: string | null) {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

// 1. Adds the access token to every request.
// 2. If the API says 401 (token expired), refreshes once and retries the request.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthCall = req.url.includes('/auth/');

  return next(withToken(req, auth.token())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthCall) {
        return throwError(() => err);
      }
      return auth.refresh().pipe(
        switchMap((token) => next(withToken(req, token))),
        catchError((refreshErr) => {
          router.navigate(['/login']);
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};