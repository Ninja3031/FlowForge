import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, map, of, startWith } from 'rxjs';
import { AdminApiService } from '../../core/admin-api.service';
import { AdminProject } from '../../core/models';

interface State {
  loading: boolean;
  error: string;
  rows: AdminProject[];
}

@Component({
  selector: 'app-projects',
  imports: [AsyncPipe, DatePipe],
  template: `
    <h1 class="page-title">Projects</h1>
    @if (state$ | async; as state) {
      @if (state.loading) {
        <p class="muted">Loading projects...</p>
      } @else if (state.error) {
        <p class="error">{{ state.error }}</p>
      } @else {
        <div class="card table-wrap">
          <table class="table">
            <thead>
              <tr><th>Project</th><th>Organization</th><th>Tasks</th><th>Progress</th><th>Created</th></tr>
            </thead>
            <tbody>
              @for (project of state.rows; track project.id) {
                <tr>
                  <td><span class="key">{{ project.key }}</span> <span class="strong">{{ project.name }}</span></td>
                  <td>{{ project.organizationName }}</td>
                  <td>{{ project.taskCount }}</td>
                  <td>
                    <div class="progress">
                      <div class="bar"><div [style.width.%]="percent(project)"></div></div>
                      <span>{{ percent(project) }}%</span>
                    </div>
                  </td>
                  <td>{{ project.createdAt | date: 'mediumDate' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="muted">No projects yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: `
    .key { font-size: 12px; font-weight: 700; color: var(--accent); background: #e6f3f1; padding: 2px 6px;
      border-radius: 4px; }
    .progress { display: flex; align-items: center; gap: 8px; min-width: 140px; }
    .bar { flex: 1; height: 6px; background: #eef1f5; border-radius: 3px; overflow: hidden; }
    .bar div { height: 100%; background: #10b981; }
    .progress span { font-size: 13px; font-weight: 700; width: 36px; text-align: right; }
  `,
})
export class ProjectsPage {
  protected state$ = inject(AdminApiService)
    .getProjects()
    .pipe(
      map((rows): State => ({ loading: false, error: '', rows })),
      catchError((err: Error) => of<State>({ loading: false, error: err.message, rows: [] })),
      startWith<State>({ loading: true, error: '', rows: [] }),
    );

  percent(project: AdminProject): number {
    return project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
  }
}