import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  AdminCreateUserRequestDto,
  AdminForceStopRequestDto,
  AdminOpenTimeEntriesResponseDto,
  AdminTimeEntriesResponseDto,
  AdminUpdateUserRequestDto,
  AdminUserResponseDto,
  AdminUsersResponseDto,
  AdminCreateManualTimeEntryRequestDto,
  AdminEditTimeEntryRequestDto,
  AdminTimeEntryResponseDto,
  AdminVoidTimeEntryRequestDto
} from '../dto/admin.dto';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);

  getUsers(filters?: {
    search?: string;
    role?: string;
    enabled?: string;
  }) {
    let params: any = {};

    if (filters?.search) params.search = filters.search;
    if (filters?.role) params.role = filters.role;
    if (filters?.enabled) params.enabled = filters.enabled;

    return this.http.get<any>(`${API_CONFIG.BASE_URL}/admin/users`, { params });
  }

  createUser(data: AdminCreateUserRequestDto) {
    return this.http.post(`${API_CONFIG.BASE_URL}/admin/users`, data);
  }

  updateUser(userId: string, data: AdminUpdateUserRequestDto) {
    return this.http.patch<AdminUserResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/users/${userId}`,
      data
    );
  }

  getOpenTimeEntries() {
    return this.http.get<AdminOpenTimeEntriesResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/open-time-entries`
    );
  }

  forceStopTimeEntry(entryId: string, data?: AdminForceStopRequestDto) {
    return this.http.post(
      `${API_CONFIG.BASE_URL}/admin/time-entries/${entryId}/force-stop`,
      data ?? {}
    );
  }

  getTimeEntries(from: string, to: string, userId?: string) {
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);

    if (userId) {
      params.set('userId', userId);
    }

    return this.http.get<AdminTimeEntriesResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/time-entries?${params.toString()}`
    );
  }

  resetUserPassword(userId: string, password: string) {
    return this.http.post(
      `${API_CONFIG.BASE_URL}/admin/users/${userId}/reset-password`,
      { password }
    );
  }

  createManualTimeEntry(data: AdminCreateManualTimeEntryRequestDto) {
    return this.http.post<AdminTimeEntryResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/time-entries/manual`,
      data
    );
  }

  editTimeEntry(entryId: string, data: AdminEditTimeEntryRequestDto) {
    return this.http.patch<AdminTimeEntryResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/time-entries/${entryId}`,
      data
    );
  }

  voidTimeEntry(entryId: string, data: AdminVoidTimeEntryRequestDto) {
    return this.http.post<AdminTimeEntryResponseDto>(
      `${API_CONFIG.BASE_URL}/admin/time-entries/${entryId}/void`,
      data
    );
  }

  downloadTimeEntriesCsv(userId: string, from: string, to: string): Observable<Blob> {
    return this.http.get(
      `${API_CONFIG.BASE_URL}/admin/time-entries/export?userId=${userId}&from=${from}&to=${to}`,
      { responseType: 'blob' }
    );
  }

}