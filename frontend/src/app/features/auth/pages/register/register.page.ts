import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
  FormsModule
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequestDto } from '../../../../core/dto/auth.dto';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css'
})
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  acceptedPrivacy = false;
  showPassword = false;
  showConfirmPassword = false;

  registerForm = this.fb.group(
    {
      name: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: passwordMatchValidator()
    }
  );

  constructor() {
    this.registerForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
      this.successMessage = '';
      this.cdr.detectChanges();
    });
  }

  get nameControl() {
    return this.registerForm.get('name');
  }

  get emailControl() {
    return this.registerForm.get('email');
  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }

  get passwordsDoNotMatch(): boolean {
    return !!this.registerForm.errors?.['passwordMismatch']
      && (this.confirmPasswordControl?.touched || this.submitted);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.acceptedPrivacy) {
      this.errorMessage = 'Debes leer y aceptar la información básica sobre protección de datos.';
      this.cdr.detectChanges();
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const data: RegisterRequestDto = {
      name: (this.registerForm.value.name ?? '').trim() || undefined,
      email: (this.registerForm.value.email ?? '').trim(),
      password: this.registerForm.value.password ?? ''
    };

    this.authService.register(data)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.registerForm.reset(
            {
              name: '',
              email: '',
              password: '',
              confirmPassword: ''
            },
            { emitEvent: false }
          );

          this.acceptedPrivacy = false;
          this.submitted = false;
          this.successMessage =
            response?.message || 'Registro completado. Pendiente de habilitación por un administrador.';
          this.cdr.detectChanges();

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2500);
        },

        error: (error) => {
          console.error('Error register:', error?.message || error);

          if (error?.status === 400) {
            this.errorMessage = error?.error?.message || 'Revisa los datos introducidos.';
          } else if (error?.status === 409) {
            this.errorMessage = 'Ya existe una cuenta con ese email.';
          } else {
            this.errorMessage = error?.error?.message || 'No se pudo completar el registro.';
          }

          this.cdr.detectChanges();
        }
      });
  }
}
