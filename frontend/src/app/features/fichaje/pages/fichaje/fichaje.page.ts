import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { GeolocationService } from '../../../../core/services/geolocation.service';
import { MapViewComponent } from '../../../../shared/components/map-view/map-view';

import { FichajeService } from '../../../../core/services/fichaje.service';
import { FichajeLocationDto, FichajeStatusResponseDto } from '../../../../core/dto/fichaje.dto';

@Component({
  selector: 'app-fichaje-page',
  standalone: true,
  imports: [CommonModule, MapViewComponent],
  templateUrl: './fichaje.page.html',
  styleUrl: './fichaje.page.css'
})
export class FichajePage implements OnInit {
  private fichajeService = inject(FichajeService);
  private cdr = inject(ChangeDetectorRef);
  private geolocationService = inject(GeolocationService);

  currentLat: number | null = null;
  currentLng: number | null = null;
  currentAccuracy: number | null = null;

  statusResponse: FichajeStatusResponseDto | null = null;
  loading = true;
  actionLoading = false;
  errorMessage = '';
  actionMessage = '';

  get isOpen(): boolean {
    return this.statusResponse?.status === 'IN';
  }

  get currentEntry() {
    return this.statusResponse?.openEntry ?? null;
  }

  ngOnInit(): void {
    this.loadStatus();
    this.loadCurrentLocation();
  }

  loadStatus(): void {
    this.loading = true;
    this.errorMessage = '';

    this.fichajeService.getStatus()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.statusResponse = response;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el estado del fichaje.';
          this.cdr.detectChanges();
        }
      });
  }

  refreshStatusSilently(): void {
    this.fichajeService.getStatus().subscribe({
      next: (response) => {
        this.statusResponse = response;
        this.cdr.detectChanges();
      }
    });
  }

  async startFichaje(): Promise<void> {
    this.actionLoading = true;
    this.actionMessage = '';
    this.errorMessage = '';

    try {
      const coords = await this.geolocationService.getCurrentPosition();

      this.currentLat = coords.lat;
      this.currentLng = coords.lng;
      this.currentAccuracy = coords.accuracy ?? null;

      this.executeStart(coords, true);
    } catch {
      this.currentLat = null;
      this.currentLng = null;
      this.currentAccuracy = null;

      this.errorMessage = 'No se pudo obtener la ubicación. El fichaje se registrará sin geolocalización.';
      this.executeStart(undefined, false);
    }
  }

  async stopFichaje(): Promise<void> {
    this.actionLoading = true;
    this.actionMessage = '';
    this.errorMessage = '';

    try {
      const coords = await this.geolocationService.getCurrentPosition();

      this.currentLat = coords.lat;
      this.currentLng = coords.lng;
      this.currentAccuracy = coords.accuracy ?? null;

      this.executeStop(coords, true);
    } catch {
      this.currentLat = null;
      this.currentLng = null;
      this.currentAccuracy = null;

      this.errorMessage = 'No se pudo obtener la ubicación. El fichaje se registrará sin geolocalización.';
      this.executeStop(undefined, false);
    }
  }

  private executeStart(coords: FichajeLocationDto | undefined, withGeo: boolean): void {
    this.fichajeService.start(coords)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.statusResponse = {
            status: 'IN',
            openEntry: response?.timeEntry ?? null
          };

          this.actionMessage = withGeo
            ? 'Jornada iniciada correctamente con ubicación.'
            : 'Jornada iniciada correctamente sin geolocalización.';

          this.cdr.detectChanges();
          this.refreshStatusSilently();
        },
        error: (error) => {
          if (error?.status === 409) {
            this.errorMessage = 'Ya existe una jornada abierta para este usuario.';
            this.loadStatus();
            return;
          }

          this.errorMessage = error?.error?.message || 'No se pudo iniciar la jornada.';
          this.cdr.detectChanges();
        }
      });
  }

  private executeStop(coords: FichajeLocationDto | undefined, withGeo: boolean): void {
    this.fichajeService.stop(coords)
      .pipe(
        finalize(() => {
          this.actionLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.statusResponse = {
            status: 'OUT',
            openEntry: null
          };

          this.actionMessage = withGeo
            ? 'Jornada finalizada correctamente con ubicación.'
            : 'Jornada finalizada correctamente sin geolocalización.';

          this.cdr.detectChanges();
          this.refreshStatusSilently();
        },
        error: (error) => {
          const backendMessage = error?.error?.message || '';

          if (error?.status === 409 && backendMessage === 'No tienes ningún fichaje abierto') {
            this.statusResponse = {
              status: 'OUT',
              openEntry: null
            };

            this.errorMessage = 'La jornada abierta ya no está disponible. El estado se ha actualizado.';
            this.cdr.detectChanges();

            this.refreshStatusSilently();
            return;
          }

          this.errorMessage = backendMessage || 'No se pudo finalizar la jornada.';
          this.cdr.detectChanges();
        }
      });
  }

  async loadCurrentLocation(): Promise<void> {
    try {
      const coords = await this.geolocationService.getCurrentPosition();
      this.currentLat = coords.lat;
      this.currentLng = coords.lng;
      this.currentAccuracy = coords.accuracy ?? null;
      this.cdr.detectChanges();
    } catch {
      this.currentLat = null;
      this.currentLng = null;
      this.currentAccuracy = null;
      this.cdr.detectChanges();
    }
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  getElapsedTimeLabel(): string {
    if (!this.currentEntry?.startAt) {
      return '-';
    }

    const start = new Date(this.currentEntry.startAt).getTime();
    const now = Date.now();

    if (Number.isNaN(start) || now < start) {
      return '-';
    }

    const diffMs = now - start;
    const totalMinutes = Math.floor(diffMs / 60000);

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
}