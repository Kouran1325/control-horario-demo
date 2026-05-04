import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

function checkAccess(url: string): boolean {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = tokenService.getToken();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  const currentUser = authService.getCurrentUser();

  // Si aún no está cargado en memoria, dejamos pasar por ahora
  if (!currentUser) {
    return true;
  }

  const hasAcceptedPrivacy = !!currentUser.privacyInfoAcceptedAt;
  const isPrivacyAckRoute = url.startsWith('/privacy-ack');
  const isPrivacyPolicyRoute = url.startsWith('/privacy-policy');

  if (!hasAcceptedPrivacy) {
    if (isPrivacyAckRoute || isPrivacyPolicyRoute) {
      return true;
    }

    router.navigate(['/privacy-ack']);
    return false;
  }

  return true;
}

export const authGuard: CanActivateFn = (_route, state) => {
  return checkAccess(state.url);
};

export const authChildGuard: CanActivateChildFn = (childRoute, state) => {
  return checkAccess(state.url);
};