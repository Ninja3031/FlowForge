import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, map, of, startWith } from 'rxjs';
import { AdminApiService } from '../../core/admin-api.service';
import { AdminOrganization } from '../../core/models';

interface State {
  loading: boolean;
  error: string;
  rows: AdminOrganization[];
}

@Component({
  selector: 'app-organizations',
  imports: [AsyncPipe, DatePipe],
  template: `
    <h1 class="page-title">Organizations</h1>
    @if (state$ | async; as state) {
      @if (state.loading) {
        <p class="muted">Loading organizations...</p>
      } @else if (state.error) {
        <p class="error">{{ state.error }}</p>
      } @else {
        <div class="card table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Members</th><th>Projects</th><th>Created</th></tr></thead>
            <tbody>
              @for (org of state.rows; track org.id) {
                <tr>
                  <td class="strong">{{ org.name }}</td>
                  <td>{{ org.memberCount }}</td>
                  <td>{{ org.projectCount }}</td>
                  <td>{{ org.createdAt | date: 'mediumDate' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="muted">No organizations yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class OrganizationsPage {
  // One stream that says loading -> data, or loading -> error
  protected state$ = inject(AdminApiService)
    .getOrganizations()
    .pipe(
      map((rows): State => ({ loading: false, error: '', rows })),
      catchError((err: Error) => of<State>({ loading: false, error: err.message, rows: [] })),
      startWith<State>({ loading: true, error: '', rows: [] }),
    );
}