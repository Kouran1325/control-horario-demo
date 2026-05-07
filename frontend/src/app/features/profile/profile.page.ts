import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserDto } from '../../core/dto/auth.dto';
import { API_CONFIG } from '../../core/config/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.css']
})
export class ProfilePage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  currentUser: UserDto | null = null;

  avatarUploading = false;
  avatarErrorMessage = '';
  avatarSuccessMessage = '';
  selectedAvatarPreview: string | null = null;

  loading = true;
  saving = false;

  successMessage = '';
  errorMessage = '';

  showCurrentPassword = false;
  showPassword = false;
  showConfirmPassword = false;

  passwordSaving = false;

  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]]
  });

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
    confirmNewPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    setTimeout(() => {
      this.loadProfile();
    });
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getMe().subscribe({
      next: (response) => {
        this.currentUser = response.user;

        this.profileForm.patchValue({
          name: response.user.name,
          email: response.user.email
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo cargar el perfil';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getAvatarUrl(): string | null {
    if (this.selectedAvatarPreview) {
      return this.selectedAvatarPreview;
    }

    const avatarUrl = this.currentUser?.avatarUrl;

    if (!avatarUrl) {
      return null;
    }

    // DEMO:
    // En producción demo guardamos el avatar como data URL base64 en BD.
    // PRODUCCIÓN REAL:
    // Lo ideal sería usar almacenamiento externo y guardar una URL pública.
    if (avatarUrl.startsWith('data:image/')) {
      return avatarUrl;
    }

    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    return `${API_CONFIG.BASE_URL.replace(/\/api$/, '')}${avatarUrl}`;
  }

  onAvatarSelected(event: Event): void {
    this.avatarErrorMessage = '';
    this.avatarSuccessMessage = '';

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.avatarErrorMessage = 'Formato no permitido. Usa JPG, PNG o WEBP.';
      this.cdr.detectChanges();
      return;
    }

    if (file.size > maxSizeBytes) {
      this.avatarErrorMessage = 'La imagen no puede superar 2 MB.';
      this.cdr.detectChanges();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedAvatarPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.uploadAvatar(file);
  }

  uploadAvatar(file: File): void {
    this.avatarUploading = true;
    this.avatarErrorMessage = '';
    this.avatarSuccessMessage = '';

    this.authService.uploadAvatar(file)
      .pipe(
        finalize(() => {
          this.avatarUploading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const currentStoredUser = this.authService.getCurrentUser();

          const updatedUser = {
            ...currentStoredUser,
            ...response.user
          };

          this.currentUser = updatedUser;
          this.authService.setUser(updatedUser);

          this.selectedAvatarPreview = null;
          this.avatarSuccessMessage = response.message || 'Foto de perfil actualizada correctamente';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.avatarErrorMessage = error?.error?.message || 'No se pudo subir la foto de perfil';
          this.cdr.detectChanges();
        }
      });
  }

  passwordsDoNotMatch(): boolean {
    const newPassword = this.passwordForm.get('newPassword')?.value ?? '';
    const confirmNewPassword = this.passwordForm.get('confirmNewPassword')?.value ?? '';

    return !!newPassword && !!confirmNewPassword && newPassword !== confirmNewPassword;
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onPasswordSubmit(): void {
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    if (this.passwordForm.invalid || this.passwordsDoNotMatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const currentPassword = this.passwordForm.get('currentPassword')?.value?.trim() || '';
    const newPassword = this.passwordForm.get('newPassword')?.value?.trim() || '';

    if (currentPassword === newPassword) {
      this.passwordErrorMessage = 'La nueva contraseña no puede ser igual a la actual';
      return;
    }

    this.passwordSaving = true;

    this.authService.changePassword({ currentPassword, newPassword })
      .pipe(
        finalize(() => {
          this.passwordSaving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.passwordSuccessMessage = response.message || 'Contraseña actualizada correctamente';
          this.passwordForm.reset();
          this.passwordForm.markAsPristine();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.passwordErrorMessage = error?.error?.message || 'No se pudo cambiar la contraseña';
          this.cdr.detectChanges();
        }
      });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const formValue = this.profileForm.getRawValue();

    const data = {
      name: formValue.name?.trim() || '',
      email: formValue.email?.trim() || ''
    };

    this.saving = true;

    this.authService.updateMe(data)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.authService.setUser(response.user);

          this.profileForm.patchValue({
            name: response.user.name,
            email: response.user.email
          });

          this.profileForm.markAsPristine();
          this.successMessage = response.message || 'Perfil actualizado correctamente';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudo actualizar el perfil';
          this.cdr.detectChanges();
        }
      });
  }

  get nameControl() {
    return this.profileForm.get('name');
  }

  get emailControl() {
    return this.profileForm.get('email');
  }

  get canSubmit(): boolean {
    return this.profileForm.valid && this.profileForm.dirty && !this.saving;
  }

  get currentPasswordControl() {
    return this.passwordForm.get('currentPassword');
  }

  get newPasswordControl() {
    return this.passwordForm.get('newPassword');
  }

  get confirmNewPasswordControl() {
    return this.passwordForm.get('confirmNewPassword');
  }

  get canSubmitPassword(): boolean {
    return this.passwordForm.valid &&
      this.passwordForm.dirty &&
      !this.passwordSaving &&
      !this.passwordsDoNotMatch();
  }
}