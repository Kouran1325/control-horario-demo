import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { API_CONFIG } from '../../../../core/config/api.config';
import { AdminService } from '../../../../core/services/admin.service';
import {
  AdminOpenTimeEntryDto,
  AdminUserDto
} from '../../../../core/dto/admin.dto';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css'
})
export class AdminPage implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private searchSubject = new Subject<string>();

  users: AdminUserDto[] = [];
  openEntries: AdminOpenTimeEntryDto[] = [];

  usersLoading = false;
  createLoading = false;
  entriesLoading = false;
  updatingUserId: string | null = null;
  closingEntryId: string | null = null;

  usersError = '';
  createError = '';
  createSuccess = '';
  entriesError = '';

  search = '';
  selectedRole = '';
  selectedEnabled = '';

  resettingPasswordUserId: string | null = null;
  resetPasswordLoading = false;
  resetPasswordError = '';
  resetPasswordSuccess = '';

  showAdminResetPassword = false;
  showAdminResetConfirmPassword = false;

  userActionSuccess = '';
  userActionError = '';

  currentUsersPage = 1;
  usersPageSize = 15;

  createUserForm = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
      ]
    ],
    role: ['USER' as 'ADMIN' | 'USER', [Validators.required]],
    enabled: [true]
  });

  resetPasswordForm = this.fb.group({
    password: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
      ]
    ],
    confirmPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadOpenEntries();

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  get totalUsersPages(): number {
    return Math.max(1, Math.ceil(this.users.length / this.usersPageSize));
  }

  get paginatedUsers(): AdminUserDto[] {
    const start = (this.currentUsersPage - 1) * this.usersPageSize;
    return this.users.slice(start, start + this.usersPageSize);
  }

  get usersPaginationLabel(): string {
    if (this.users.length === 0) return '0 usuarios';

    const start = (this.currentUsersPage - 1) * this.usersPageSize + 1;
    const end = Math.min(this.currentUsersPage * this.usersPageSize, this.users.length);

    return `${start}-${end} de ${this.users.length} usuarios`;
  }

  get usersCountLabel(): string {
    const total = this.users.length;
    return total === 1 ? '1 usuario encontrado' : `${total} usuarios encontrados`;
  }

  goToPreviousUsersPage(): void {
    if (this.currentUsersPage > 1) {
      this.currentUsersPage--;
    }
  }

  goToNextUsersPage(): void {
    if (this.currentUsersPage < this.totalUsersPages) {
      this.currentUsersPage++;
    }
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';

    this.adminService.getUsers()
      .pipe(
        finalize(() => {
          this.usersLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.currentUsersPage = 1;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.usersError = error?.error?.message || 'No se pudieron cargar los usuarios.';
          this.cdr.detectChanges();
        }
      });
  }

  getAvatarUrl(avatarUrl?: string | null): string {
    if (!avatarUrl) return '';

    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    return `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}${avatarUrl}`;
  }

  createUser(): void {
    this.createError = '';
    this.createSuccess = '';

    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.createLoading = true;

    const data = {
      name: (this.createUserForm.value.name ?? '').trim() || undefined,
      email: (this.createUserForm.value.email ?? '').trim(),
      password: this.createUserForm.value.password ?? '',
      role: this.createUserForm.value.role ?? 'USER',
      enabled: this.createUserForm.value.enabled ?? true
    };

    this.adminService.createUser(data)
      .pipe(
        finalize(() => {
          this.createLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.createSuccess = 'Usuario creado correctamente.';
          this.createUserForm.reset({
            name: '',
            email: '',
            password: '',
            role: 'USER',
            enabled: true
          });
          this.loadUsers();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.createError = error?.error?.message || 'No se pudo crear el usuario.';
          this.cdr.detectChanges();
        }
      });
  }

  toggleEnabled(user: AdminUserDto): void {
    this.updatingUserId = user.id;
    this.usersError = '';
    this.userActionError = '';
    this.userActionSuccess = '';

    this.adminService.updateUser(user.id, {
      enabled: !user.enabled
    }).pipe(
      finalize(() => {
        this.updatingUserId = null;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.userActionSuccess = user.enabled
          ? 'Usuario deshabilitado correctamente.'
          : 'Usuario habilitado correctamente.';
        this.loadUsers();
      },
      error: (error) => {
        this.userActionError = error?.error?.message || 'No se pudo actualizar el usuario.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleRole(user: AdminUserDto): void {
    this.updatingUserId = user.id;
    this.usersError = '';
    this.userActionError = '';
    this.userActionSuccess = '';

    const newRole: 'ADMIN' | 'USER' = user.role === 'ADMIN' ? 'USER' : 'ADMIN';

    this.adminService.updateUser(user.id, {
      role: newRole
    }).pipe(
      finalize(() => {
        this.updatingUserId = null;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.userActionSuccess = newRole === 'ADMIN'
          ? 'Usuario actualizado a ADMIN correctamente.'
          : 'Usuario actualizado a USER correctamente.';
        this.loadUsers();
      },
      error: (error) => {
        this.userActionError = error?.error?.message || 'No se pudo cambiar el rol.';
        this.cdr.detectChanges();
      }
    });
  }

  openResetPassword(user: AdminUserDto): void {
    this.resettingPasswordUserId = user.id;
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';
    this.userActionError = '';
    this.userActionSuccess = '';
    this.showAdminResetPassword = false;
    this.showAdminResetConfirmPassword = false;

    this.resetPasswordForm.reset({
      password: '',
      confirmPassword: ''
    });

    this.cdr.detectChanges();
  }

  cancelResetPassword(): void {
    this.resettingPasswordUserId = null;
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';
    this.showAdminResetPassword = false;
    this.showAdminResetConfirmPassword = false;

    this.resetPasswordForm.reset({
      password: '',
      confirmPassword: ''
    });

    this.cdr.detectChanges();
  }

  submitResetPassword(user: AdminUserDto): void {
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const password = this.resetPasswordForm.value.password ?? '';
    const confirmPassword = this.resetPasswordForm.value.confirmPassword ?? '';

    if (password !== confirmPassword) {
      this.resetPasswordError = 'Las contraseñas no coinciden.';
      this.cdr.detectChanges();
      return;
    }

    this.resetPasswordLoading = true;

    this.adminService.resetUserPassword(user.id, password)
      .pipe(
        finalize(() => {
          this.resetPasswordLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.resetPasswordSuccess = response?.message || 'Contraseña actualizada correctamente.';
          this.resetPasswordForm.reset({
            password: '',
            confirmPassword: ''
          });
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.resetPasswordError = error?.error?.message || 'No se pudo actualizar la contraseña.';
          this.cdr.detectChanges();
        }
      });
  }

  toggleAdminResetPasswordVisibility(): void {
    this.showAdminResetPassword = !this.showAdminResetPassword;
  }

  toggleAdminResetConfirmPasswordVisibility(): void {
    this.showAdminResetConfirmPassword = !this.showAdminResetConfirmPassword;
  }

  get resetPasswordPasswordControl() {
    return this.resetPasswordForm.get('password');
  }

  get resetPasswordConfirmControl() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  loadOpenEntries(): void {
    this.entriesLoading = true;
    this.entriesError = '';

    this.adminService.getOpenTimeEntries()
      .pipe(
        finalize(() => {
          this.entriesLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.openEntries = response.openEntries;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.entriesError = error?.error?.message || 'No se pudieron cargar los fichajes abiertos.';
          this.cdr.detectChanges();
        }
      });
  }

  forceStop(entryId: string): void {
    this.closingEntryId = entryId;
    this.entriesError = '';

    this.adminService.forceStopTimeEntry(entryId, {
      reason: 'Cierre manual por administrador'
    }).pipe(
      finalize(() => {
        this.closingEntryId = null;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: () => {
        this.loadOpenEntries();
      },
      error: (error) => {
        this.entriesError = error?.error?.message || 'No se pudo cerrar el fichaje.';
        this.cdr.detectChanges();
      }
    });
  }

  formatDateTime(value: string | null): string {
    if (!value) return '-';

    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  applyFilters(): void {
    this.usersLoading = true;
    this.usersError = '';

    this.adminService.getUsers({
      search: this.search.trim(),
      role: this.selectedRole,
      enabled: this.selectedEnabled
    })
      .pipe(
        finalize(() => {
          this.usersLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.currentUsersPage = 1;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.usersError = error?.error?.message || 'No se pudieron filtrar los usuarios.';
          this.cdr.detectChanges();
        }
      });
  }

  clearFilters(): void {
    this.search = '';
    this.selectedRole = '';
    this.selectedEnabled = '';
    this.applyFilters();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.search.trim());
  }
}