import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { UserDto } from '../dto/auth.dto';
import { API_CONFIG } from '../config/api.config';
import {
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  MeResponseDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  UpdateMeRequestDto,
  UpdateMeResponseDto
} from '../dto/auth.dto';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private userSubject = new BehaviorSubject<UserDto | null>(null);
  user$ = this.userSubject.asObservable();

  login(data: LoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${API_CONFIG.BASE_URL}/auth/login`, data);
  }

  getMe(): Observable<MeResponseDto> {
    return this.http.get<MeResponseDto>(`${API_CONFIG.BASE_URL}/auth/me`);
  }

  updateMe(data: UpdateMeRequestDto): Observable<UpdateMeResponseDto> {
    return this.http.patch<UpdateMeResponseDto>(`${API_CONFIG.BASE_URL}/auth/me`, data);
  }

  uploadAvatar(file: File): Observable<UpdateMeResponseDto> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<UpdateMeResponseDto>(
      `${API_CONFIG.BASE_URL}/auth/me/avatar`,
      formData
    );
  }

  changePassword(data: ChangePasswordRequestDto): Observable<ChangePasswordResponseDto> {
    return this.http.patch<ChangePasswordResponseDto>(`${API_CONFIG.BASE_URL}/auth/change-password`, data);
  }

  forgotPassword(data: ForgotPasswordRequestDto): Observable<ForgotPasswordResponseDto> {
    return this.http.post<ForgotPasswordResponseDto>(`${API_CONFIG.BASE_URL}/auth/forgot-password`, data);
  }

  resetPassword(data: ResetPasswordRequestDto): Observable<ResetPasswordResponseDto> {
    return this.http.post<ResetPasswordResponseDto>(`${API_CONFIG.BASE_URL}/auth/reset-password`, data);
  }

  logout(): void {
    this.tokenService.clearToken();
  }

  register(data: RegisterRequestDto) {
    return this.http.post(`${API_CONFIG.BASE_URL}/auth/register`, data);
  }

  setUser(user: UserDto | null): void {
    this.userSubject.next(user);
  }

  getCurrentUser(): UserDto | null {
    return this.userSubject.value;
  }

  acknowledgePrivacy() {
    return this.http.patch<{ ok: boolean; message: string; user: UserDto }>(
      `${API_CONFIG.BASE_URL}/auth/privacy-ack`,
      {}
    );
  }
}