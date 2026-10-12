import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="login">
      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <h1>FlowForge admin</h1>
        <p class="muted">For platform super admins only.</p>

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
        <button class="btn" type="submit" [disabled]="loading()">
          {{ loading() ? 'Logging in...' : 'Log in' }}
        </button>
        <button type="button" class="link" (click)="fillDemo()">Fill in demo super admin</button>
      </form>
    </main>
  `,
  styles: `
    .login { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    form { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 6px; padding: 28px; }
    h1 { margin: 0; font-size: 22px; }
    .muted { margin: 0 0 12px; }
    .btn { margin-top: 12px; }
    .label { margin-top: 8px; }
  `,
})
export class LoginPage implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(false);
  protected error = signal('');

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