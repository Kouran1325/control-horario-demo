import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';

import {
  AdminAuditLogDto,
  AuditService
} from '../../../../core/services/audit.service';

import { AdminService } from '../../../../core/services/admin.service';
import { AdminUserDto } from '../../../../core/dto/admin.dto';

@Component({
  selector: 'app-admin-audit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-audit.page.html',
  styleUrl: './admin-audit.page.css'
})
export class AdminAuditPage implements OnInit {
  private auditService = inject(AuditService);
  private adminService = inject(AdminService);
  private cdr = inject(ChangeDetectorRef);

  logs: AdminAuditLogDto[] = [];
  admins: AdminUserDto[] = [];

  loading = false;
  adminsLoading = false;
  errorMessage = '';

  selectedAction = '';
  selectedAdminUserId = '';
  targetId = '';
  fromDate = '';
  toDate = '';

  currentPage = 1;
  pageSize = 15;

  readonly actionOptions = [
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGIN_DISABLED_USER',
    'ADMIN_CREATE_USER',
    'ADMIN_UPDATE_USER',
    'ADMIN_RESET_PASSWORD',
    'ADMIN_EDIT_TIME_ENTRY',
    'ADMIN_VOID_TIME_ENTRY',
    'ADMIN_FORCE_STOP_ENTRY',
    'ADMIN_FORCE_STOP_OPEN',
    'TIME_ENTRY_TAMPERED_DETECTED',
    'PRIVACY_INFO_ACKNOWLEDGED'
  ];

  ngOnInit(): void {
    this.loadAdmins();
    this.loadAuditLogs();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.logs.length / this.pageSize));
  }

  get paginatedLogs(): AdminAuditLogDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.logs.slice(start, start + this.pageSize);
  }

  get auditPaginationLabel(): string {
    if (this.logs.length === 0) return '0 registros';

    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.logs.length);

    return `${start}-${end} de ${this.logs.length} registros`;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  loadAdmins(): void {
    this.adminsLoading = true;

    this.adminService.getUsers({ role: 'ADMIN' })
      .pipe(
        finalize(() => {
          this.adminsLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.admins = response.users;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading admin users for audit:', error?.message || error);
          this.cdr.detectChanges();
        }
      });
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.errorMessage = '';

    this.auditService.getAuditLogs({
      action: this.selectedAction || undefined,
      adminUserId: this.selectedAdminUserId || undefined,
      targetId: this.targetId.trim() || undefined,
      from: this.fromDate || undefined,
      to: this.toDate || undefined
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.logs = response.logs;
          this.currentPage = 1;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading audit logs:', error?.message || error);
          this.errorMessage = error?.error?.message || 'No se pudieron cargar los registros de auditoría.';
          this.cdr.detectChanges();
        }
      });
  }

  clearFilters(): void {
    this.selectedAction = '';
    this.selectedAdminUserId = '';
    this.targetId = '';
    this.fromDate = '';
    this.toDate = '';
    this.currentPage = 1;
    this.loadAuditLogs();
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  getMetadataPreview(metadata: unknown): string {
    if (!metadata) return '-';

    try {
      const json = JSON.stringify(metadata);
      return json.length > 140 ? `${json.slice(0, 140)}...` : json;
    } catch {
      return 'Metadatos no disponibles';
    }
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      LOGIN_SUCCESS: 'Login correcto',
      LOGIN_FAILED: 'Login fallido',
      LOGIN_DISABLED_USER: 'Login usuario deshabilitado',
      ADMIN_CREATE_USER: 'Creación de usuario',
      ADMIN_UPDATE_USER: 'Actualización de usuario',
      ADMIN_RESET_PASSWORD: 'Reset de contraseña',
      ADMIN_EDIT_TIME_ENTRY: 'Edición de fichaje',
      ADMIN_VOID_TIME_ENTRY: 'Anulación de fichaje',
      ADMIN_FORCE_STOP_ENTRY: 'Cierre forzado',
      ADMIN_FORCE_STOP_OPEN: 'Cierre forzado abierto',
      TIME_ENTRY_TAMPERED_DETECTED: 'Manipulación detectada',
      PRIVACY_INFO_ACKNOWLEDGED: 'Aceptación información privacidad'
    };

    return labels[action] || action;
  }

  getActionBadgeClass(action: string): string {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case 'PRIVACY_INFO_ACKNOWLEDGED':
      case 'ADMIN_CREATE_USER':
        return 'badge success';

      case 'LOGIN_FAILED':
      case 'LOGIN_DISABLED_USER':
      case 'TIME_ENTRY_TAMPERED_DETECTED':
        return 'badge danger';

      case 'ADMIN_UPDATE_USER':
      case 'ADMIN_EDIT_TIME_ENTRY':
      case 'ADMIN_RESET_PASSWORD':
        return 'badge warning';

      case 'ADMIN_VOID_TIME_ENTRY':
      case 'ADMIN_FORCE_STOP_ENTRY':
      case 'ADMIN_FORCE_STOP_OPEN':
        return 'badge neutral';

      default:
        return 'badge';
    }
  }
}