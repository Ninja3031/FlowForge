import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

// Only super admins get past this. Everyone else goes to /login.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .restoreSession()
    .pipe(map((ok) => (ok && auth.isSuperAdmin() ? true : router.createUrlTree(['/login']))));
};