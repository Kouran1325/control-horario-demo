import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-privacy-ack-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy-ack.page.html',
  styleUrl: './privacy-ack.page.css'
})
export class PrivacyAckPage {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  confirmPrivacy(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.acknowledgePrivacy()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.authService.setUser(response.user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error confirming privacy info:', error?.message || error);
          this.errorMessage = error?.error?.message || 'No se pudo confirmar la información.';
          this.cdr.detectChanges();
        }
      });
  }
}