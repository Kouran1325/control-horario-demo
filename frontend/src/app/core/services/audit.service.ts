import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';

export interface AdminAuditLogDto {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  admin: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface AdminAuditLogsResponseDto {
  ok: boolean;
  logs: AdminAuditLogDto[];
}

export interface GetAuditLogsParams {
  action?: string;
  adminUserId?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private http = inject(HttpClient);

  getAuditLogs(params?: GetAuditLogsParams): Observable<AdminAuditLogsResponseDto> {
    let httpParams = new HttpParams();

    if (params?.action) {
      httpParams = httpParams.set('action', params.action);
    }

    if (params?.adminUserId) {
      httpParams = httpParams.set('adminUserId', params.adminUserId);
    }

    if (params?.targetId) {
      httpParams = httpParams.set('targetId', params.targetId);
    }

    if (params?.from) {
      httpParams = httpParams.set('from', params.from);
    }

    if (params?.to) {
      httpParams = httpParams.set('to', params.to);
    }

    return this.http.get<AdminAuditLogsResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/audit`,
      { params: httpParams }
    );
  }
}