import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { FichajeLocationDto, FichajeStatusResponseDto } from '../dto/fichaje.dto';
import { FichajeSummaryResponseDto } from '../dto/fichaje.dto';

@Injectable({
  providedIn: 'root'
})
export class FichajeService {
  private http = inject(HttpClient);

  getStatus(): Observable<FichajeStatusResponseDto> {
    return this.http.get<FichajeStatusResponseDto>(`${API_CONFIG.BASE_URL}/fichaje/status`);
  }

  start(data?: FichajeLocationDto): Observable<unknown> {
    return this.http.post(`${API_CONFIG.BASE_URL}/fichaje/start`, data ?? {});
  }

  stop(data?: FichajeLocationDto): Observable<unknown> {
    return this.http.post(`${API_CONFIG.BASE_URL}/fichaje/stop`, data ?? {});
  }

  getSummary(from: string, to: string) {
    return this.http.get<FichajeSummaryResponseDto>(
      `${API_CONFIG.BASE_URL}/fichaje/summary?from=${from}&to=${to}`
    );
  }
  downloadSummaryCsv(from: string, to: string): Observable<Blob> {
    return this.http.get(
      `${API_CONFIG.BASE_URL}/fichaje/export?from=${from}&to=${to}`,
      { responseType: 'blob' }
    );
  }
}