import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { Shell } from './layout/shell';

// Pages are lazy loaded: their code is only downloaded when you visit them
export const routes: Routes = [
  {
    path: 'login',
    title: 'Log in | FlowForge Admin',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    component: Shell,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        title: 'Dashboard | FlowForge Admin',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'users',
        title: 'Users | FlowForge Admin',
        loadComponent: () => import('./pages/users/users').then((m) => m.UsersPage),
      },
      {
        path: 'users/:id',
        title: 'Edit user | FlowForge Admin',
        loadComponent: () => import('./pages/user-edit/user-edit').then((m) => m.UserEditPage),
      },
      {
        path: 'organizations',
        title: 'Organizations | FlowForge Admin',
        loadComponent: () =>
          import('./pages/organizations/organizations').then((m) => m.OrganizationsPage),
      },
      {
        path: 'projects',
        title: 'Projects | FlowForge Admin',
        loadComponent: () => import('./pages/projects/projects').then((m) => m.ProjectsPage),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: 'admin' },
];
