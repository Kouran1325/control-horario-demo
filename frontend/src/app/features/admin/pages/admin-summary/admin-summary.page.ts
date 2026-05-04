import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../../../core/services/admin.service';
import { AdminTimeEntryDto, AdminUserDto } from '../../../../core/dto/admin.dto';
import { MapViewComponent } from '../../../../shared/components/map-view/map-view';
import { API_CONFIG } from '../../../../core/config/api.config';

interface AdminSummaryDayEntry {
  startAt: string;
  endAt: string;
  minutes: number;
  latStart: number | null;
  lonStart: number | null;
  accuracyStart: number | null;
  latEnd: number | null;
  lonEnd: number | null;
  accuracyEnd: number | null;
}

interface AdminSummaryDay {
  date: string;
  minutes: number;
  hours: number;
  entries: AdminSummaryDayEntry[];
}

@Component({
  selector: 'app-admin-summary-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapViewComponent, RouterLink],
  templateUrl: './admin-summary.page.html',
  styleUrl: './admin-summary.page.css'
})
export class AdminSummaryPage implements OnInit {
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private readonly mobileBreakpoint = 900;

  isMobileView = window.innerWidth <= this.mobileBreakpoint;

  users: AdminUserDto[] = [];
  selectedUserId = '';
  fromDate = '';
  toDate = '';
  todayForPdf = new Date().toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  manualCreateLoading = false;
  manualCreateError = '';
  manualCreateSuccess = '';
  isExportingPdf = false;

  manualEntryForm = this.fb.group({
    userId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: [''],
    keepOpen: [false],
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  usersLoading = false;
  loading = false;
  errorMessage = '';

  selectedUser: AdminUserDto | null = null;
  summaryDays: AdminSummaryDay[] = [];
  totalMinutes = 0;
  totalHours = 0;
  daysWorked = 0;

  editingEntryId: string | null = null;
  editEntryLoading = false;
  editEntryError = '';
  editEntrySuccess = '';

  flatEntries: AdminTimeEntryDto[] = [];
  filteredEntries: AdminTimeEntryDto[] = [];
  selectedStatusFilter = 'ALL';

  editEntryForm = this.fb.group({
    date: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: [''],
    keepOpen: [false],
    reason: ['', [Validators.required, Validators.minLength(5)]]
  });

  voidingEntryId: string | null = null;
  voidEntryLoading = false;
  voidEntryError = '';
  voidEntrySuccess = '';

  voidReason = '';

  async exportPdf(): Promise<void> {
    const element = document.getElementById('pdf-content');

    if (!element) return;

    this.isExportingPdf = true;
    this.cdr.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const html2pdf = (await import('html2pdf.js')).default;

    const options: any = {
      margin: 10,
      filename: `informe_${this.selectedUser?.email || 'usuario'}_${this.fromDate}_${this.toDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    try {
      await html2pdf().set(options).from(element).save();
    } finally {
      this.isExportingPdf = false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.fromDate = today;
    this.toDate = today;
    this.loadUsers();
    this.manualEntryForm.patchValue({
      date: today
    });
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.errorMessage = '';

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
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudieron cargar los usuarios.';
          this.cdr.detectChanges();
        }
      });
  }

  loadSummary(): void {
    if (!this.selectedUserId) {
      this.errorMessage = 'Debes seleccionar un usuario.';
      return;
    }

    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Debes seleccionar ambas fechas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.summaryDays = [];
    this.totalMinutes = 0;
    this.totalHours = 0;
    this.daysWorked = 0;

    this.selectedUser = this.users.find(u => u.id === this.selectedUserId) ?? null;

    this.adminService.getTimeEntries(this.fromDate, this.toDate, this.selectedUserId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.flatEntries = response.entries;
          this.applyFilters();
          this.buildSummary(response.entries);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudo obtener el resumen.';
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    switch (this.selectedStatusFilter) {
      case 'MANUAL':
        this.filteredEntries = this.flatEntries.filter((e) => e.createdByAdmin);
        break;
      case 'EDITED':
        this.filteredEntries = this.flatEntries.filter((e) => e.editedByAdmin);
        break;
      case 'VOIDED':
        this.filteredEntries = this.flatEntries.filter((e) => e.voidedByAdmin);
        break;
      case 'TAMPERED':
        this.filteredEntries = this.flatEntries.filter((e) => e.isTampered);
        break;
      case 'CLOSED_BY_ADMIN':
        this.filteredEntries = this.flatEntries.filter((e) => e.closedByAdmin);
        break;
      default:
        this.filteredEntries = [...this.flatEntries];
        break;
    }

    this.cdr.detectChanges();
  }

  createManualEntry(): void {
    this.manualCreateError = '';
    this.manualCreateSuccess = '';

    if (this.manualEntryForm.invalid) {
      this.manualEntryForm.markAllAsTouched();
      return;
    }

    const formValue = this.manualEntryForm.getRawValue();

    const userId = formValue.userId ?? '';
    const date = formValue.date ?? '';
    const startTime = formValue.startTime ?? '';
    const endTime = formValue.endTime ?? '';
    const keepOpen = formValue.keepOpen ?? false;
    const reason = (formValue.reason ?? '').trim();

    const startAt = this.buildIsoFromLocal(date, startTime);

    if (!startAt) {
      this.manualCreateError = 'La fecha y hora de inicio no son válidas.';
      this.cdr.detectChanges();
      return;
    }

    let endAt: string | null = null;

    if (!keepOpen) {
      if (!endTime) {
        this.manualCreateError = 'Debes indicar hora de fin o marcar el fichaje como abierto.';
        this.cdr.detectChanges();
        return;
      }

      endAt = this.buildIsoFromLocal(date, endTime);

      if (!endAt) {
        this.manualCreateError = 'La hora de fin no es válida.';
        this.cdr.detectChanges();
        return;
      }
    }

    this.manualCreateLoading = true;

    this.adminService.createManualTimeEntry({
      userId,
      startAt,
      endAt,
      reason
    })
      .pipe(
        finalize(() => {
          this.manualCreateLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.manualCreateSuccess = response.message || 'Fichaje manual creado correctamente.';

          this.manualEntryForm.reset({
            userId: this.selectedUserId || '',
            date: this.fromDate || '',
            startTime: '',
            endTime: '',
            keepOpen: false,
            reason: ''
          });

          if (this.selectedUserId) {
            this.loadSummary();
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.manualCreateError = error?.error?.message || 'No se pudo crear el fichaje manual.';
          this.cdr.detectChanges();
        }
      });
  }

  openEditEntry(entry: AdminTimeEntryDto): void {
    this.editingEntryId = entry.id;
    this.editEntryError = '';
    this.editEntrySuccess = '';

    const startDate = this.toInputDate(entry.startAt);
    const startTime = this.toInputTime(entry.startAt);
    const endDate = entry.endAt ? this.toInputDate(entry.endAt) : startDate;
    const endTime = entry.endAt ? this.toInputTime(entry.endAt) : '';

    this.editEntryForm.reset({
      date: startDate,
      startTime,
      endTime,
      keepOpen: entry.endAt === null,
      reason: ''
    });

    this.cdr.detectChanges();
  }

  cancelEditEntry(): void {
    this.editingEntryId = null;
    this.editEntryError = '';
    this.editEntrySuccess = '';

    this.editEntryForm.reset({
      date: '',
      startTime: '',
      endTime: '',
      keepOpen: false,
      reason: ''
    });

    this.cdr.detectChanges();
  }

  submitEditEntry(entry: AdminTimeEntryDto): void {
    this.editEntryError = '';
    this.editEntrySuccess = '';

    if (this.editEntryForm.invalid) {
      this.editEntryForm.markAllAsTouched();
      return;
    }

    const formValue = this.editEntryForm.getRawValue();

    const date = formValue.date ?? '';
    const startTime = formValue.startTime ?? '';
    const endTime = formValue.endTime ?? '';
    const keepOpen = formValue.keepOpen ?? false;
    const reason = (formValue.reason ?? '').trim();

    const startAt = this.buildIsoFromLocal(date, startTime);

    if (!startAt) {
      this.editEntryError = 'La fecha y hora de inicio no son válidas.';
      this.cdr.detectChanges();
      return;
    }

    let endAt: string | null = null;

    if (!keepOpen) {
      if (!endTime) {
        this.editEntryError = 'Debes indicar hora de fin o marcar el fichaje como abierto.';
        this.cdr.detectChanges();
        return;
      }

      endAt = this.buildIsoFromLocal(date, endTime);

      if (!endAt) {
        this.editEntryError = 'La hora de fin no es válida.';
        this.cdr.detectChanges();
        return;
      }
    }

    this.editEntryLoading = true;

    this.adminService.editTimeEntry(entry.id, {
      startAt,
      endAt,
      reason
    })
      .pipe(
        finalize(() => {
          this.editEntryLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.editEntrySuccess = response.message || 'Fichaje actualizado correctamente.';
          this.loadSummary();

          setTimeout(() => {
            this.cancelEditEntry();
          }, 1200);

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.editEntryError = error?.error?.message || 'No se pudo actualizar el fichaje.';
          this.cdr.detectChanges();
        }
      });
  }

  openVoidEntry(entry: AdminTimeEntryDto): void {
    this.voidingEntryId = entry.id;
    this.voidEntryError = '';
    this.voidEntrySuccess = '';
    this.voidReason = '';
    this.cdr.detectChanges();
  }

  cancelVoidEntry(): void {
    this.voidingEntryId = null;
    this.voidEntryError = '';
    this.voidEntrySuccess = '';
    this.voidReason = '';
    this.cdr.detectChanges();
  }

  submitVoidEntry(entry: AdminTimeEntryDto): void {
    this.voidEntryError = '';
    this.voidEntrySuccess = '';

    const reason = this.voidReason.trim();

    if (!reason) {
      this.voidEntryError = 'Debes indicar un motivo.';
      this.cdr.detectChanges();
      return;
    }

    this.voidEntryLoading = true;

    this.adminService.voidTimeEntry(entry.id, { reason })
      .pipe(
        finalize(() => {
          this.voidEntryLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.voidEntrySuccess = response.message || 'Fichaje anulado correctamente.';
          this.loadSummary();

          setTimeout(() => {
            this.cancelVoidEntry();
          }, 1200);

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.voidEntryError = error?.error?.message || 'No se pudo anular el fichaje.';
          this.cdr.detectChanges();
        }
      });
  }

  private toInputDate(dateString: string): string {
    return new Date(dateString).toISOString().slice(0, 10);
  }

  private toInputTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  get editDateControl() {
    return this.editEntryForm.get('date');
  }

  get editStartTimeControl() {
    return this.editEntryForm.get('startTime');
  }

  get editEndTimeControl() {
    return this.editEntryForm.get('endTime');
  }

  get editReasonControl() {
    return this.editEntryForm.get('reason');
  }

  private buildIsoFromLocal(date: string, time: string): string | null {
    if (!date || !time) return null;

    const full = `${date}T${time}:00`;
    const parsed = new Date(full);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  get manualUserIdControl() {
    return this.manualEntryForm.get('userId');
  }

  get manualDateControl() {
    return this.manualEntryForm.get('date');
  }

  get manualStartTimeControl() {
    return this.manualEntryForm.get('startTime');
  }

  get manualEndTimeControl() {
    return this.manualEntryForm.get('endTime');
  }

  get manualReasonControl() {
    return this.manualEntryForm.get('reason');
  }

  private buildSummary(entries: AdminTimeEntryDto[]): void {
    const closedEntries = entries.filter(
      (entry) => !entry.voidedByAdmin && entry.endAt && entry.durationMinutes !== null
    ) as Array<AdminTimeEntryDto & { endAt: string; durationMinutes: number }>;

    const dailyMap = new Map<string, AdminSummaryDay>();

    closedEntries.forEach((entry) => {
      const date = entry.startAt.slice(0, 10);

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          minutes: 0,
          hours: 0,
          entries: []
        });
      }

      const currentDay = dailyMap.get(date)!;

      currentDay.entries.push({
        startAt: entry.startAt,
        endAt: entry.endAt,
        minutes: entry.durationMinutes,
        latStart: entry.latStart,
        lonStart: entry.lonStart,
        accuracyStart: entry.accuracyStart,
        latEnd: entry.latEnd,
        lonEnd: entry.lonEnd,
        accuracyEnd: entry.accuracyEnd
      });

      currentDay.minutes += entry.durationMinutes;
      currentDay.hours = Math.round((currentDay.minutes / 60) * 100) / 100;
    });

    this.summaryDays = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    this.totalMinutes = this.summaryDays.reduce((acc, day) => acc + day.minutes, 0);
    this.totalHours = Math.round((this.totalMinutes / 60) * 100) / 100;
    this.daysWorked = this.summaryDays.length;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMinutesAsHours(minutes: number | null): string {
    if (minutes === null || minutes < 0) return '-';

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

  @HostListener('window:resize')
  onWindowResize(): void {
    this.isMobileView = window.innerWidth <= this.mobileBreakpoint;
    this.cdr.detectChanges();
  }

  getEntryMapPoints(entry: {
    startAt: string;
    endAt?: string | null;
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
        label: entry.endAt ? `Fin ${this.formatTime(entry.endAt)}` : 'Fin'
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
    if (!this.selectedUserId) {
      this.errorMessage = 'Debes seleccionar un usuario.';
      this.cdr.detectChanges();
      return;
    }

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

    this.adminService.downloadTimeEntriesCsv(this.selectedUserId, this.fromDate, this.toDate)
      .subscribe({
        next: (blob) => {
          const userLabel = this.selectedUser?.email || this.selectedUserId;
          const fileName = `fichajes_${userLabel}_${this.fromDate}_a_${this.toDate}.csv`;
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