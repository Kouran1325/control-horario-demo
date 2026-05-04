import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ResetPasswordRequestDto } from '../../../../core/dto/auth.dto';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.css'
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  loading = false;
  submitted = false;
  token = '';

  successMessage = '';
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  resetPasswordForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.pattern(this.passwordPattern)]],
    confirmNewPassword: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.errorMessage = 'El enlace de recuperación no es válido o no incluye token.';
    }

    this.resetPasswordForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
      this.successMessage = '';
    });
  }

  get newPasswordControl() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmNewPasswordControl() {
    return this.resetPasswordForm.get('confirmNewPassword');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }



  passwordsDoNotMatch(): boolean {
    const newPassword = this.resetPasswordForm.get('newPassword')?.value ?? '';
    const confirmNewPassword = this.resetPasswordForm.get('confirmNewPassword')?.value ?? '';

    return !!newPassword && !!confirmNewPassword && newPassword !== confirmNewPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'El enlace de recuperación no es válido o ha expirado.';
      return;
    }

    if (this.resetPasswordForm.invalid || this.passwordsDoNotMatch()) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.resetPasswordForm.get('newPassword')?.value?.trim() || '';

    this.loading = true;

    const data: ResetPasswordRequestDto = {
      token: this.token,
      newPassword
    };

    this.authService.resetPassword(data)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.successMessage = response.message || 'Contraseña restablecida correctamente.';
          this.submitted = false;
          this.resetPasswordForm.reset();
          this.resetPasswordForm.markAsPristine();
        },
        error: (error) => {
          console.error('Error reset password:', error?.message || error);
          this.errorMessage = error?.error?.message || 'No se pudo restablecer la contraseña.';
        }
      });
  }
}