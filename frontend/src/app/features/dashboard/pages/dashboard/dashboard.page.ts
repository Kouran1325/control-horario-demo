import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { UserDto } from '../../../../core/dto/auth.dto';
import { FichajeService } from '../../../../core/services/fichaje.service';
import { FichajeStatusResponseDto } from '../../../../core/dto/fichaje.dto';
import { API_CONFIG } from '../../../../core/config/api.config';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private fichajeService = inject(FichajeService);
  private cdr = inject(ChangeDetectorRef);

  user: UserDto | null = null;
  statusResponse: FichajeStatusResponseDto | null = null;

  errorMessage = '';
  loading = true;

  get isOpen(): boolean {
    return this.statusResponse?.status === 'IN';
  }

  get currentEntry() {
    return this.statusResponse?.openEntry ?? null;
  }
  getAvatarUrl(path?: string | null): string | null {
    if (!path) return null;

    return `${API_CONFIG.ORIGIN_URL}${path}`;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.authService.getMe().subscribe({
      next: (response) => {
        this.user = response.user;

        this.fichajeService.getStatus()
          .pipe(
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            })
          )
          .subscribe({
            next: (status) => {
              this.statusResponse = status;
              this.cdr.detectChanges();
            },
            error: () => {
              this.errorMessage = 'No se pudo cargar el estado del fichaje.';
              this.cdr.detectChanges();
            }
          });
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el usuario actual.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  getElapsedTimeLabel(): string {
    const startAt = this.statusResponse?.openEntry?.startAt;

    if (!startAt) {
      return '-';
    }

    const start = new Date(startAt).getTime();
    const now = Date.now();

    if (Number.isNaN(start) || now < start) {
      return '-';
    }

    const totalMinutes = Math.floor((now - start) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    if (minutes === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${minutes} min`;
  }

  getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }
}