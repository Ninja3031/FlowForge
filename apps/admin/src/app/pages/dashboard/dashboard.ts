import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';
import { AdminApiService } from '../../core/admin-api.service';
import { ROLE_LABELS, Role } from '../../core/models';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'In review',
  DONE: 'Done',
};

@Component({
  selector: 'app-dashboard',
  imports: [AsyncPipe, DatePipe],
  template: `
    <h1 class="page-title">Dashboard</h1>

    @if (vm$ | async; as vm) {
      @if (vm.error) {
        <p class="error">{{ vm.error }}</p>
      } @else if (vm.stats && vm.health) {
        <section class="card health">
          <div>
            <h2>System health</h2>
            <p class="muted">Checked {{ vm.checkedAt | date: 'mediumTime' }}. Refreshes every 30 seconds.</p>
          </div>
          <ul>
            @for (service of services; track service.key) {
              <li>
                <span class="dot" [class.down]="!vm.health.services[service.key]"></span>
                {{ service.label }}: {{ vm.health.services[service.key] ? 'Up' : 'Down' }}
              </li>
            }
          </ul>
        </section>

        <section class="figures">
          @for (figure of vm.figures; track figure.label) {
            <div class="card figure">
              <span class="muted">{{ figure.label }}</span>
              <strong>{{ figure.value }}</strong>
            </div>
          }
        </section>

        <section class="split">
          <div class="card">
            <h2>Tasks by status</h2>
            @for (row of vm.taskRows; track row.label) {
              <div class="bar-row">
                <span>{{ row.label }}</span>
                <div class="bar"><div [style.width.%]="row.percent"></div></div>
                <span class="num">{{ row.count }}</span>
              </div>
            }
          </div>
          <div class="card">
            <h2>Users by role</h2>
            @for (row of vm.roleRows; track row.label) {
              <div class="bar-row">
                <span>{{ row.label }}</span>
                <div class="bar"><div [style.width.%]="row.percent"></div></div>
                <span class="num">{{ row.count }}</span>
              </div>
            }
          </div>
        </section>
      }
    } @else {
      <p class="muted">Loading dashboard...</p>
    }
  `,
  styles: `
    h2 { margin: 0 0 12px; font-size: 16px; }
    .health { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .health h2 { margin: 0; }
    .health p { margin: 4px 0 0; }
    .health ul { display: flex; gap: 20px; list-style: none; margin: 0; padding: 0; align-items: center;
      font-size: 14px; font-weight: 600; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #10b981; margin-right: 6px; }
    .dot.down { background: #dc2626; }
    .figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .figure { display: flex; flex-direction: column; gap: 4px; }
    .figure .muted { font-size: 13px; }
    .figure strong { font-size: 26px; }
    .split { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 40px; align-items: center; gap: 10px;
      font-size: 14px; margin-bottom: 8px; }
    .bar { height: 8px; background: #eef1f5; border-radius: 4px; overflow: hidden; }
    .bar div { height: 100%; background: var(--accent); }
    .num { text-align: right; font-weight: 700; }
  `,
})
export class DashboardPage {
  private api = inject(AdminApiService);

  protected services = [
    { key: 'mysql' as const, label: 'MySQL' },
    { key: 'mongo' as const, label: 'MongoDB' },
    { key: 'redis' as const, label: 'Redis' },
  ];

  // timer(0, 30000): load now, then every 30 seconds.
  // switchMap cancels a slow request if the next tick arrives first.
  // forkJoin runs both requests in parallel and waits for both.
  protected vm$ = timer(0, 30_000).pipe(
    switchMap(() =>
      forkJoin({ stats: this.api.getStats(), health: this.api.getHealth() }).pipe(
        map(({ stats, health }) => {
          const toRows = (counts: Record<string, number>, labels: Record<string, string>) => {
            const max = Math.max(1, ...Object.values(counts));
            return Object.keys(labels).map((key) => ({
              label: labels[key],
              count: counts[key] ?? 0,
              percent: ((counts[key] ?? 0) / max) * 100,
            }));
          };
          return {
            error: '',
            stats,
            health,
            checkedAt: new Date(),
            figures: [
              { label: 'Organizations', value: stats.organizations },
              { label: 'Users', value: stats.users },
              { label: 'Projects', value: stats.projects },
              { label: 'Tasks', value: stats.tasks },
              { label: 'Activity (7 days)', value: stats.activityLast7Days },
              { label: 'AI health reports', value: stats.aiHealthReports },
            ],
            taskRows: toRows(stats.tasksByStatus, STATUS_LABELS),
            roleRows: toRows(stats.usersByRole, ROLE_LABELS as Record<Role, string>),
          };
        }),
        // An error on one tick shouldn't stop the next refresh
        catchError((err: Error) => of({ error: err.message, stats: null, health: null } as const)),
      ),
    ),
  );
}