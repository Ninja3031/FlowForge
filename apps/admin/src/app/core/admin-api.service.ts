import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { API_URL } from './config';
import { ApiError } from './api.error';
import {
  AdminOrganization,
  AdminProject,
  AdminUser,
  PlatformStats,
  Role,
  SystemHealth,
} from './models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);

  getStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${API_URL}/admin/stats`);
  }

  // /health answers 503 when a database is down, but the body still says which one
  getHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${API_URL}/health`).pipe(
      catchError((err) => {
        if (err instanceof ApiError && err.body) return of(err.body as SystemHealth);
        return of<SystemHealth>({ status: 'down', services: { mysql: false, mongo: false, redis: false } });
      }),
    );
  }

  getUsers(filters: { search: string; role: Role | '' }): Observable<AdminUser[]> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.role) params = params.set('role', filters.role);
    return this.http.get<AdminUser[]>(`${API_URL}/admin/users`, { params });
  }

  getUser(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${API_URL}/admin/users/${id}`);
  }

  updateUser(
    id: number,
    changes: Partial<{ name: string; role: Role; isActive: boolean }>,
  ): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${API_URL}/admin/users/${id}`, changes);
  }

  getOrganizations(): Observable<AdminOrganization[]> {
    return this.http.get<AdminOrganization[]>(`${API_URL}/admin/organizations`);
  }

  getProjects(): Observable<AdminProject[]> {
    return this.http.get<AdminProject[]>(`${API_URL}/admin/projects`);
  }
}