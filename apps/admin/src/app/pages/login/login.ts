import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// Same "random-looking" values every time, for the floating embers
const hash = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="login">
      <!-- Sunrise backdrop: glow, sun, embers and a dark hill -->
      <div class="scene" aria-hidden="true">
        <div class="sky-glow"></div>
        <div class="sun"></div>
        @for (ember of embers; track $index) {
          <span
            class="ember"
            [style.left.%]="ember.left"
            [style.animation-delay.s]="ember.delay"
            [style.animation-duration.s]="ember.duration"
            [style.--drift]="ember.drift + 'px'"
          ></span>
        }
        <div class="hill"></div>
      </div>

      <div class="wrap fade-up">
        <p class="display wordmark">FlowForge</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="card">
          <h1>Admin console</h1>
          <p class="muted sub">For platform super admins only.</p>

          <label class="label" for="email">Email</label>
          <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="field-error">Enter a valid email.</p>
          }

          <label class="label" for="password">Password</label>
          <input id="password" class="input" type="password" formControlName="password"
            autocomplete="current-password" />

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button class="btn submit" type="submit" [disabled]="loading()">
            {{ loading() ? 'Logging in...' : 'Log in' }}
          </button>
          <button type="button" class="link demo" (click)="fillDemo()">Fill in demo super admin</button>
        </form>
      </div>
    </main>
  `,
  styles: `
    .login { position: relative; min-height: 100vh; display: grid; place-items: center; padding: 48px 16px; overflow: hidden; }
    .scene { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .sky-glow {
      position: absolute; left: 50%; bottom: -55vmin; width: 130vmin; height: 130vmin; transform: translateX(-50%);
      border-radius: 50%; background: radial-gradient(circle, rgb(255 138 61 / 0.3), rgb(255 110 40 / 0.1) 35%, transparent 65%);
      animation: fade-in 2.4s ease-out both;
    }
    .sun {
      position: absolute; left: 50%; bottom: -14vmin; width: 52vmin; height: 52vmin; margin-left: -26vmin;
      border-radius: 50%;
      background: radial-gradient(circle, #fffaf0 0%, #ffefd6 42%, #ffcf98 64%, #ff9d50 78%, #e8692a 86%, rgb(232 105 42 / 0) 91%);
      box-shadow: 0 0 120px 40px rgb(255 138 61 / 0.3);
      animation: rise 2.2s var(--ease) both, sun-breathe 6s ease-in-out 2.2s infinite;
    }
    .ember {
      position: absolute; bottom: 16%; width: 3px; height: 3px; border-radius: 50%; background: var(--glow);
      box-shadow: 0 0 8px 2px rgb(255 160 90 / 0.8); animation: ember 8s linear infinite;
    }
    .hill {
      position: absolute; left: -10%; right: -10%; bottom: -28vmin; height: 44vmin;
      border-radius: 50% 50% 0 0 / 100% 100% 0 0; background: #090706;
    }
    .wrap { position: relative; width: 100%; max-width: 380px; }
    .wordmark { margin: 0 0 28px; text-align: center; font-size: 30px; }
    form {
      display: flex; flex-direction: column; gap: 6px; padding: 28px;
      background: rgb(21 18 16 / 0.82); backdrop-filter: blur(12px); box-shadow: 0 30px 80px rgb(0 0 0 / 0.6);
    }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.01em; }
    .sub { margin: 4px 0 16px; font-size: 14px; }
    .label { margin-top: 8px; }
    .submit { margin-top: 16px; padding: 11px; }
    .demo { margin-top: 12px; align-self: center; }
    @keyframes rise { from { transform: translateY(35%); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes fade-in { from { opacity: 0; } }
  `,
})
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(false);
  protected error = signal('');

  protected embers = Array.from({ length: 18 }, (_, i) => ({
    left: 20 + hash(i + 1) * 60,
    delay: hash(i + 13) * 8,
    duration: 6 + hash(i + 21) * 6,
    drift: Math.round((hash(i + 31) - 0.5) * 120),
  }));

  protected form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // Already logged in as super admin? Go straight to the dashboard.
    this.auth.restoreSession().subscribe((ok) => {
      if (ok && this.auth.isSuperAdmin()) this.router.navigate(['/admin']);
    });
  }

  fillDemo(): void {
    this.form.setValue({ email: 'superadmin@flowforge.dev', password: 'Password@123' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}