import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { errorInterceptor } from './core/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless: Angular updates the screen when signals change, on user events,
    // and through the async pipe, without the Zone.js library
    provideZonelessChangeDetection(),
    provideRouter(routes),
    // Order matters: errorInterceptor wraps authInterceptor, so the auth one
    // sees the raw 401 first and can refresh the token before errors are converted.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
  ],
};