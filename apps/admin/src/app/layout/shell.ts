import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <a routerLink="/admin" class="brand">
          <span class="logo">F</span>
          <span>FlowForge <small>Admin</small></span>
        </a>
        <nav>
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: link.exact }"
              >{{ link.label }}</a
            >
          }
        </nav>
        <div class="me">
          <p>{{ auth.user()?.name }}</p>
          <button class="btn-secondary" (click)="auth.logout()">Log out</button>
        </div>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    .sidebar { display: flex; flex-direction: column; gap: 24px; padding: 20px 16px;
      background: var(--ink); color: #fff; }
    .brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 800; }
    .brand small { color: #9fb0c6; font-weight: 600; }
    .logo { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 6px;
      background: var(--accent); }
    nav { display: flex; flex-direction: column; gap: 2px; }
    nav a { padding: 8px 10px; border-radius: 6px; color: #c7d2e0; font-size: 14px; font-weight: 600; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(255,255,255,.1); color: #fff; }
    .me { margin-top: auto; font-size: 14px; }
    .me p { margin: 0 0 8px; color: #c7d2e0; }
    .content { padding: 32px; min-width: 0; }
    @media (max-width: 760px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { flex-direction: row; flex-wrap: wrap; align-items: center; }
      nav { flex-direction: row; flex-wrap: wrap; }
      .me { margin: 0 0 0 auto; }
      .content { padding: 20px; }
    }
  `,
})
export class Shell {
  protected auth = inject(AuthService);
  protected links = [
    { path: '/admin', label: 'Dashboard', exact: true },
    { path: '/admin/users', label: 'Users', exact: false },
    { path: '/admin/organizations', label: 'Organizations', exact: false },
    { path: '/admin/projects', label: 'Projects', exact: false },
  ];
}