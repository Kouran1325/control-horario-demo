import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { TokenService } from '../../../../core/services/token.service';
import { LoginRequestDto } from '../../../../core/dto/auth.dto';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  submitted = false;
  errorMessage = '';
  showPassword = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor() {
    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const data: LoginRequestDto = {
      email: (this.loginForm.value.email ?? '').trim(),
      password: this.loginForm.value.password ?? ''
    };

    this.authService.login(data)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.tokenService.setToken(response.token);
          this.cdr.detectChanges();

          if (!response.user?.privacyInfoAcceptedAt) {
            this.router.navigate(['/privacy-ack']);
            return;
          }

          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error login:', error?.message || error);

          if (error?.status === 400) {
            this.errorMessage = 'Debes introducir un email y una contraseña válidos.';
          } else if (error?.status === 401) {
            this.errorMessage = 'Credenciales inválidas.';
          } else if (error?.status === 403) {
            this.errorMessage = 'Tu cuenta está pendiente de habilitación por un administrador.';
          } else if (error?.status === 429) {
            this.errorMessage = error?.error?.message || 'Demasiados intentos. Inténtalo de nuevo en unos segundos.';
          } else {
            this.errorMessage = error?.error?.message || 'No se pudo iniciar sesión.';
          }

          this.cdr.detectChanges();
        }
      });
  }
}