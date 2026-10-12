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
    <p class="eyebrow">Across every organization</p>
    <h1 class="display page-title">Projects</h1>
    @if (state$ | async; as state) {
      @if (state.loading) {
        <p class="faint">Loading projects...</p>
      } @else if (state.error) {
        <p class="error">{{ state.error }}</p>
      } @else {
        <div class="card table-wrap fade-up">
          <table class="table">
            <thead>
              <tr><th>Project</th><th>Organization</th><th>Tasks</th><th>Progress</th><th>Created</th></tr>
            </thead>
            <tbody>
              @for (project of state.rows; track project.id) {
                <tr [style.animation-delay.ms]="$index * 40">
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
                <tr><td colspan="5" class="faint">No projects yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: `
    .key { font-size: 11px; font-weight: 800; letter-spacing: 0.15em; color: var(--accent-soft); margin-right: 8px; }
    .progress { display: flex; align-items: center; gap: 10px; min-width: 160px; }
    .bar { flex: 1; height: 5px; background: var(--raised); border-radius: 3px; overflow: hidden; }
    .bar div {
      height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), var(--glow));
      box-shadow: 0 0 10px rgb(255 138 61 / 0.5); transition: width 1s var(--ease);
    }
    .progress span { font-size: 13px; font-weight: 700; width: 38px; text-align: right; color: var(--ink); }
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