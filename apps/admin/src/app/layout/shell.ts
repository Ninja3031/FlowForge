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
          <span class="display">FlowForge</span>
          <span class="eyebrow">Admin console</span>
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
          <div class="who">
            <span class="avatar">{{ initials() }}</span>
            <div>
              <p class="name">{{ auth.user()?.name }}</p>
              <p class="role">Super admin</p>
            </div>
          </div>
          <button class="btn-secondary" (click)="auth.logout()">Log out</button>
        </div>
      </aside>
      <main class="content">
        <!-- Soft ember glow behind every page -->
        <div class="glow" aria-hidden="true"></div>
        <div class="page">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    .sidebar {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 32px;
      padding: 24px 16px; background: var(--surface); border-right: 1px solid var(--line);
    }
    .brand { display: flex; flex-direction: column; gap: 6px; padding: 0 10px; }
    .brand .display { font-size: 22px; }
    nav { display: flex; flex-direction: column; gap: 2px; }
    nav a {
      position: relative; padding: 9px 12px; border-radius: 10px; color: var(--muted);
      font-size: 14px; font-weight: 600; transition: color 0.25s, background-color 0.25s;
    }
    nav a:hover { color: var(--ink); background: var(--raised); }
    nav a.active { color: var(--ink); background: var(--raised); }
    /* Small glowing ember bar next to the active page */
    nav a.active::before {
      content: ''; position: absolute; left: -16px; top: 9px; bottom: 9px; width: 3px;
      border-radius: 0 3px 3px 0; background: var(--accent); box-shadow: 0 0 12px var(--accent);
    }
    .me { margin-top: auto; display: flex; flex-direction: column; gap: 12px; padding: 0 6px; }
    .who { display: flex; align-items: center; gap: 10px; }
    .avatar {
      display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
      background: var(--raised); border: 1px solid var(--line); font-size: 12px; font-weight: 800; color: var(--muted);
    }
    .name { margin: 0; font-size: 14px; font-weight: 700; }
    .role { margin: 0; font-size: 12px; color: var(--faint); }
    .content { position: relative; min-width: 0; padding: 40px 44px; }
    .glow {
      position: absolute; inset: -260px 0 auto; margin: 0 auto; height: 420px; max-width: 900px;
      border-radius: 50%; filter: blur(60px); opacity: 0.6; pointer-events: none;
      background: radial-gradient(circle, rgb(255 138 61 / 0.16), transparent 70%);
    }
    /* view-transition-name tells the browser which part should animate between pages */
    .page { position: relative; view-transition-name: page; }
    @media (max-width: 800px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 16px; border-right: 0; border-bottom: 1px solid var(--line); }
      nav { flex-direction: row; flex-wrap: wrap; }
      nav a.active::before { display: none; }
      .me { margin: 0 0 0 auto; flex-direction: row; align-items: center; }
      .content { padding: 24px 20px; }
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

  protected initials(): string {
    const name = this.auth.user()?.name ?? '';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }
}