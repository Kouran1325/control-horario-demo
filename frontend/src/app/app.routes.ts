import { Routes } from '@angular/router';

import { LoginPage } from './features/auth/pages/login/login.page';
import { RegisterPage } from './features/auth/pages/register/register.page';
import { ProfilePage } from './features/profile/profile.page';
import { DashboardPage } from './features/dashboard/pages/dashboard/dashboard.page';
import { FichajePage } from './features/fichaje/pages/fichaje/fichaje.page';
import { SummaryPage } from './features/summary/pages/summary/summary.page';

import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout';

import { authGuard, authChildGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

import { AdminPage } from './features/admin/pages/admin/admin.page';
import { adminGuard } from './core/guards/admin.guard';
import { AdminSummaryPage } from './features/admin/pages/admin-summary/admin-summary.page';

import { ForgotPasswordPage } from './features/auth/pages/forgot-password/forgot-password.page';
import { ResetPasswordPage } from './features/auth/pages/reset-password/reset-password.page';

import { PrivacyPolicyPage } from './features/legal/pages/privacy-policy/privacy-policy.page';

import { PrivacyAckPage } from './features/legal/pages/privacy-ack/privacy-ack.page';

import { AdminAuditPage } from './features/admin/pages/admin-audit/admin-audit.page';

export const routes: Routes = [

  {
    path: 'login',
    component: LoginPage,
    canActivate: [guestGuard]
  },

  {
    path: 'register',
    component: RegisterPage,
    canActivate: [guestGuard]
  },

  {
    path: 'privacy-policy',
    component: PrivacyPolicyPage
  },

  {
    path: 'forgot-password',
    component: ForgotPasswordPage,
    canActivate: [guestGuard]
  },

  {
    path: 'reset-password',
    component: ResetPasswordPage,
    canActivate: [guestGuard]
  },

  {
  path: '',
  component: MainLayoutComponent,
  canActivate: [authGuard],
  canActivateChild: [authChildGuard],
  children: [
    {
      path: 'dashboard',
      component: DashboardPage
    },
    {
      path: 'fichaje',
      component: FichajePage
    },
    {
      path: 'summary',
      component: SummaryPage
    },
    {
      path: 'admin',
      component: AdminPage,
      canActivate: [adminGuard]
    },
    {
      path: 'admin/summary',
      component: AdminSummaryPage,
      canActivate: [adminGuard]
    },
    {
      path: '',
      redirectTo: 'dashboard',
      pathMatch: 'full'
    },
    {
      path: 'profile',
      component: ProfilePage
    },
    {
      path: 'privacy-ack',
      component: PrivacyAckPage
    },
    {
      path: 'admin/audit',
      component: AdminAuditPage,
      canActivate: [adminGuard]
    },
  ]
},

  {
    path: '**',
    redirectTo: 'dashboard'
  },

];