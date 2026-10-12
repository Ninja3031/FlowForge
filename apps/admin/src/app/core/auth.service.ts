import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { API_URL } from './config';
import { ApiError } from './api.error';
import { Session, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // The access token lives only in memory. The refresh token is an httpOnly cookie.
  private accessToken: string | null = null;
  private refreshInFlight$: Observable<string> | null = null;

  readonly user = signal<User | null>(null);
  readonly isSuperAdmin = computed(() => this.user()?.role === 'SUPER_ADMIN');

  token(): string | null {
    return this.accessToken;
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<Session>(`${API_URL}/auth/login`, { email, password }, { withCredentials: true })
      .pipe(
        map((session) => {
          if (session.user.role !== 'SUPER_ADMIN') {
            throw new ApiError(403, 'Only super admins can use the admin console.');
          }
          return session;
        }),
        tap((session) => this.setSession(session)),
        map((session) => session.user),
      );
  }

  // Get a new access token using the refresh cookie.
  // shareReplay means 5 requests failing at once still trigger only ONE refresh call.
  refresh(): Observable<string> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http
        .post<Session>(`${API_URL}/auth/refresh`, null, { withCredentials: true })
        .pipe(
          tap((session) => this.setSession(session)),
          map((session) => session.accessToken),
          catchError((err) => {
            this.clear();
            return throwError(() => err);
          }),
          finalize(() => (this.refreshInFlight$ = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight$;
  }

  // Used by the route guard after a page reload
  restoreSession(): Observable<boolean> {
    if (this.user()) return of(true);
    return this.refresh().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  logout(): void {
    this.http
      .post(`${API_URL}/auth/logout`, null, { withCredentials: true })
      .pipe(finalize(() => {
        this.clear();
        this.router.navigate(['/login']);
      }))
      .subscribe({ error: () => {} });
  }

  clear(): void {
    this.accessToken = null;
    this.user.set(null);
  }

  private setSession(session: Session): void {
    this.accessToken = session.accessToken;
    this.user.set(session.user);
  }
}