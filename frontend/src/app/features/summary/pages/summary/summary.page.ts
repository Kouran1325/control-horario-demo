import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { API_CONFIG } from '../../../../core/config/api.config';
import { FichajeService } from '../../../../core/services/fichaje.service';
import { FichajeSummaryResponseDto } from '../../../../core/dto/fichaje.dto';
import { MapViewComponent } from '../../../../shared/components/map-view/map-view';

@Component({
  selector: 'app-summary-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MapViewComponent],
  templateUrl: './summary.page.html',
  styleUrl: './summary.page.css'
})
export class SummaryPage {
  private fichajeService = inject(FichajeService);
  private cdr = inject(ChangeDetectorRef);

  fromDate = '';
  toDate = '';
  todayForPdf = new Date().toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  summary: FichajeSummaryResponseDto | null = null;

  loading = false;
  errorMessage = '';

  loadSummary(): void {
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Debes seleccionar ambas fechas.';
      return;
    }

    if (this.fromDate > this.toDate) {
      this.errorMessage = 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.fichajeService.getSummary(this.fromDate, this.toDate)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: FichajeSummaryResponseDto) => {
          this.summary = response;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'No se pudo obtener el resumen.';
          this.cdr.detectChanges();
        }
      });
  }

  async exportPdf(): Promise<void> {
    const element = document.getElementById('pdf-content');

    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;

    const options: any = {
      margin: [10, 10, 12, 10],
      filename: this.getPdfFileName(),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: {
        mode: ['css', 'legacy']
      }
    };

    html2pdf().set(options).from(element).save();
  }

  getPdfFileName(): string {
    const from = this.fromDate || 'sin-desde';
    const to = this.toDate || 'sin-hasta';
    return `resumen_horas_${from}_a_${to}.pdf`;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatInputDate(dateString: string): string {
    if (!dateString) return '-';

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  formatMinutesAsHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} h`;
    }

    return `${hours} h ${remainingMinutes} min`;
  }

  formatHoursDecimal(hours: number): string {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(hours);
  }

  getEntryMapPoints(entry: {
    startAt: string;
    endAt: string;
    latStart?: number | null;
    lonStart?: number | null;
    latEnd?: number | null;
    lonEnd?: number | null;
  }): { lat: number; lng: number; label?: string }[] {
    const points: { lat: number; lng: number; label?: string }[] = [];

    if (entry.latStart != null && entry.lonStart != null) {
      points.push({
        lat: entry.latStart,
        lng: entry.lonStart,
        label: `Inicio ${this.formatTime(entry.startAt)}`
      });
    }

    if (entry.latEnd != null && entry.lonEnd != null) {
      points.push({
        lat: entry.latEnd,
        lng: entry.lonEnd,
        label: `Fin ${this.formatTime(entry.endAt)}`
      });
    }

    return points;
  }

  hasEntryMap(entry: {
    latStart?: number | null;
    lonStart?: number | null;
    latEnd?: number | null;
    lonEnd?: number | null;
  }): boolean {
    return (
      (entry.latStart != null && entry.lonStart != null) ||
      (entry.latEnd != null && entry.lonEnd != null)
    );
  }

  downloadCsv(): void {
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Debes seleccionar ambas fechas.';
      this.cdr.detectChanges();
      return;
    }

    if (this.fromDate > this.toDate) {
      this.errorMessage = 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';

    this.fichajeService.downloadSummaryCsv(this.fromDate, this.toDate)
      .subscribe({
        next: (blob) => {
          const fileName = `resumen_horas_${this.fromDate}_a_${this.toDate}.csv`;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download = fileName;
          link.click();

          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudo descargar el CSV.';
          this.cdr.detectChanges();
        }
      });
  }
}