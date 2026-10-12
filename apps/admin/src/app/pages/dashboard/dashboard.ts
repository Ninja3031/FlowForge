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
    <p class="eyebrow">Platform overview</p>
    <h1 class="display page-title">Dashboard</h1>

    @if (vm$ | async; as vm) {
      @if (vm.error) {
        <p class="error">{{ vm.error }}</p>
      } @else if (vm.stats && vm.health) {
        <section class="card health fade-up">
          <div>
            <h2>System health</h2>
            <p class="faint">Checked {{ vm.checkedAt | date: 'mediumTime' }}. Refreshes every 30 seconds.</p>
          </div>
          <ul>
            @for (service of services; track service.key) {
              <li [class.down]="!vm.health.services[service.key]">
                <span class="dot"></span>
                {{ service.label }}
                <span class="state">{{ vm.health.services[service.key] ? 'Up' : 'Down' }}</span>
              </li>
            }
          </ul>
        </section>

        <section class="figures">
          @for (figure of vm.figures; track figure.label) {
            <div class="card figure fade-up" [style.animation-delay.ms]="$index * 60">
              <span class="eyebrow">{{ figure.label }}</span>
              <strong class="display">{{ figure.value }}</strong>
            </div>
          }
        </section>

        <section class="split">
          <div class="card fade-up" style="animation-delay: 200ms">
            <h2>Tasks by status</h2>
            @for (row of vm.taskRows; track row.label) {
              <div class="bar-row">
                <span>{{ row.label }}</span>
                <div class="bar"><div [style.width.%]="row.percent"></div></div>
                <span class="num">{{ row.count }}</span>
              </div>
            }
          </div>
          <div class="card fade-up" style="animation-delay: 280ms">
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
      <p class="faint">Loading dashboard...</p>
    }
  `,
  styles: `
    h2 { margin: 0 0 16px; font-size: 16px; font-weight: 700; }
    .health { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
    .health h2 { margin: 0; }
    .health p { margin: 4px 0 0; font-size: 13px; }
    .health ul { display: flex; flex-wrap: wrap; gap: 10px; list-style: none; margin: 0; padding: 0; }
    .health li {
      display: flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px;
      background: var(--raised); border: 1px solid var(--line); font-size: 14px; font-weight: 600;
      color: var(--success); transition: color 0.4s, border-color 0.4s;
    }
    .health li.down { color: var(--danger); border-color: rgb(255 122 107 / 0.35); }
    .health .state { color: var(--faint); font-weight: 500; }
    /* Pulsing dot: green when up, red when down */
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse-dot 2s ease-in-out infinite; }
    .figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .figure { display: flex; flex-direction: column; gap: 10px; }
    .figure strong { font-size: 40px; color: var(--ink); }
    .split { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
    .bar-row { display: grid; grid-template-columns: 120px 1fr 36px; align-items: center; gap: 12px; font-size: 14px; color: var(--muted); margin-bottom: 12px; }
    .bar { height: 6px; background: var(--raised); border-radius: 3px; overflow: hidden; }
    .bar div {
      height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--accent), var(--glow));
      box-shadow: 0 0 10px rgb(255 138 61 / 0.6); transition: width 1s var(--ease);
    }
    .num { text-align: right; font-weight: 700; color: var(--ink); }
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