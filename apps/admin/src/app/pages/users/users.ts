import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AdminApiService } from '../../core/admin-api.service';
import { AdminUser, ROLE_LABELS, Role } from '../../core/models';

@Component({
  selector: 'app-users',
  imports: [AsyncPipe, DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <p class="eyebrow">Everyone on the platform</p>
    <h1 class="display page-title">Users</h1>

    <div class="filters">
      <input class="input search" type="search" placeholder="Search by name or email"
        aria-label="Search users" [formControl]="search" />
      <select class="input role" aria-label="Filter by role" [formControl]="role">
        <option value="">All roles</option>
        @for (r of roles; track r) {
          <option [value]="r">{{ roleLabels[r] }}</option>
        }
      </select>
      @if (loading()) {
        <span class="searching"><span class="spinner"></span>Searching...</span>
      }
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @if (users$ | async; as users) {
      <div class="card table-wrap fade-up">
        <table class="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Organization</th><th>Status</th><th>Joined</th></tr>
          </thead>
          <tbody>
            @for (user of users; track user.id) {
              <tr [style.animation-delay.ms]="$index * 30">
                <td><a [routerLink]="['/admin/users', user.id]" class="strong-link">{{ user.name }}</a></td>
                <td>{{ user.email }}</td>
                <td>{{ roleLabels[user.role] }}</td>
                <td>{{ user.organizationName ?? 'None' }}</td>
                <td>
                  <span class="badge" [class.badge-off]="!user.isActive">
                    {{ user.isActive ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td>{{ user.createdAt | date: 'mediumDate' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="faint">No users match these filters.</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 18px; }
    .search { max-width: 320px; border-radius: 999px; padding-left: 16px; }
    .role { width: auto; }
    .searching { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--faint); }
    .spinner {
      width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--accent);
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class UsersPage {
  private api = inject(AdminApiService);

  protected roles = Object.keys(ROLE_LABELS) as Role[];
  protected roleLabels = ROLE_LABELS;
  protected loading = signal(false);
  protected error = signal('');

  protected search = new FormControl('', { nonNullable: true });
  protected role = new FormControl<Role | ''>('', { nonNullable: true });

  // The RxJS search pipeline:
  // typing -> wait 300ms -> skip if text didn't change -> cancel the old request -> new request
  private search$ = this.search.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    map((text) => text.trim()),
    distinctUntilChanged(),
  );

  private role$ = this.role.valueChanges.pipe(startWith<Role | ''>(''));

  protected users$ = combineLatest([this.search$, this.role$]).pipe(
    tap(() => {
      this.loading.set(true);
      this.error.set('');
    }),
    switchMap(([search, role]) =>
      this.api.getUsers({ search, role }).pipe(
        catchError((err: Error) => {
          this.error.set(err.message);
          return of([] as AdminUser[]);
        }),
      ),
    ),
    tap(() => this.loading.set(false)),
  );
}