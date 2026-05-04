import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { TokenService } from '../services/token.service';

export const guestGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const token = tokenService.getToken();

  if (token) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};