import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AdminApiService } from '../../core/admin-api.service';
import { AuthService } from '../../core/auth.service';
import { AdminUser, ROLE_LABELS, Role } from '../../core/models';

@Component({
  selector: 'app-user-edit',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <a routerLink="/admin/users" class="muted back">Back to users</a>

    @if (loadError()) {
      <p class="error">{{ loadError() }}</p>
    }

    @if (user(); as user) {
      <h1 class="page-title">{{ user.name }}</h1>
      <p class="muted">
        {{ user.email }}, {{ user.organizationName ?? 'no organization' }}, joined
        {{ user.createdAt | date: 'mediumDate' }}
      </p>

      <form [formGroup]="form" (ngSubmit)="save()" class="card form">
        <label class="label" for="name">Name</label>
        <input id="name" class="input" formControlName="name" />
        @if (form.controls.name.touched && form.controls.name.invalid) {
          <p class="field-error">Name needs at least 2 characters.</p>
        }

        <label class="label" for="role">Role</label>
        <select id="role" class="input" formControlName="role">
          @for (r of editableRoles; track r) {
            <option [value]="r">{{ roleLabels[r] }}</option>
          }
          @if (user.role === 'SUPER_ADMIN') {
            <option value="SUPER_ADMIN">Super admin</option>
          }
        </select>
        @if (lockedReason()) {
          <p class="muted hint">{{ lockedReason() }}</p>
        }

        <label class="checkbox">
          <input type="checkbox" formControlName="isActive" />
          Account is active
        </label>
        <p class="muted hint">Changing the role or disabling the account logs the user out everywhere.</p>

        @if (saveError()) {
          <p class="error">{{ saveError() }}</p>
        }
        @if (saved()) {
          <p class="success">Saved changes.</p>
        }

        <div class="actions">
          <button class="btn" type="submit" [disabled]="form.pristine || form.invalid || saving()">
            {{ saving() ? 'Saving...' : 'Save changes' }}
          </button>
          <button class="btn-secondary" type="button" [disabled]="form.pristine" (click)="reset()">
            Discard
          </button>
        </div>
      </form>
    } @else if (!loadError()) {
      <p class="muted">Loading user...</p>
    }
  `,
  styles: `
    .back { display: inline-block; margin-bottom: 8px; font-size: 14px; }
    .form { max-width: 460px; display: flex; flex-direction: column; gap: 6px; margin-top: 16px; }
    .label { margin-top: 8px; }
    .checkbox { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-weight: 600; font-size: 14px; }
    .hint { margin: 2px 0 0; font-size: 13px; }
    .actions { display: flex; gap: 8px; margin-top: 16px; }
  `,
})
export class UserEditPage implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AdminApiService);
  private auth = inject(AuthService);

  protected roleLabels = ROLE_LABELS;
  protected editableRoles: Role[] = ['ORG_ADMIN', 'PROJECT_MANAGER', 'MEMBER'];

  protected user = signal<AdminUser | null>(null);
  protected loadError = signal('');
  protected saveError = signal('');
  protected saving = signal(false);
  protected saved = signal(false);
  protected lockedReason = signal('');

  // Reactive form: the form's state lives in TypeScript, not in the template
  protected form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    role: ['MEMBER' as Role],
    isActive: [true],
  });

  ngOnInit(): void {
    // Re-runs if the :id in the URL changes while this page is open
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => this.api.getUser(id)),
      )
      .subscribe({
        next: (user) => this.load(user),
        error: (err: Error) => this.loadError.set(err.message),
      });
  }

  private load(user: AdminUser): void {
    this.user.set(user);
    this.form.reset({ name: user.name, role: user.role, isActive: user.isActive });

    // Some fields can't be changed, so we disable them in the form
    const isMe = user.id === this.auth.user()?.id;
    this.form.controls.role.enable();
    this.form.controls.isActive.enable();
    this.lockedReason.set('');

    if (isMe) {
      this.form.controls.role.disable();
      this.form.controls.isActive.disable();
      this.lockedReason.set("You can't change your own role or disable yourself.");
    } else if (user.organizationId === null) {
      this.form.controls.role.disable();
      this.lockedReason.set('This user has no organization, so their role is fixed.');
    }
  }

  reset(): void {
    const user = this.user();
    if (user) this.load(user);
  }

  save(): void {
    const user = this.user();
    if (!user || this.form.invalid) return;

    // Only send the fields that actually changed
    const changes: Partial<{ name: string; role: Role; isActive: boolean }> = {};
    const { controls } = this.form;
    if (controls.name.dirty) changes.name = controls.name.value;
    if (controls.role.dirty && controls.role.enabled) changes.role = controls.role.value;
    if (controls.isActive.dirty && controls.isActive.enabled) changes.isActive = controls.isActive.value;

    this.saving.set(true);
    this.saveError.set('');
    this.saved.set(false);

    this.api.updateUser(user.id, changes).subscribe({
      next: (updated) => {
        this.load(updated);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: (err: Error) => {
        this.saveError.set(err.message);
        this.saving.set(false);
      },
    });
  }
}