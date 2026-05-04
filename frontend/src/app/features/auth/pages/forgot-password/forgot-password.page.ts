import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ForgotPasswordRequestDto } from '../../../../core/dto/auth.dto';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.css'
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    this.forgotPasswordForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
      this.successMessage = '';
    });
  }

  get emailControl() {
    return this.forgotPasswordForm.get('email');
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const data: ForgotPasswordRequestDto = {
      email: (this.forgotPasswordForm.value.email ?? '').trim().toLowerCase()
    };

    this.authService.forgotPassword(data)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.successMessage = response.message || 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.';
          this.forgotPasswordForm.markAsPristine();
        },
        error: (error) => {
          console.error('Error forgot password:', error?.message || error);
          this.errorMessage = error?.error?.message || 'No se pudo procesar la solicitud.';
        }
      });
  }
}