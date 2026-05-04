export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
  privacyInfoAcceptedAt?: string | null;
  privacyInfoVersion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponseDto {
  ok: boolean;
  token: string;
  user: UserDto;
}

export interface MeResponseDto {
  user: UserDto;
}

export interface RegisterRequestDto {
  name?: string;
  email: string;
  password: string;
}

export interface UpdateMeRequestDto {
  name: string;
  email: string;
}

export interface UpdateMeResponseDto {
  ok: boolean;
  message: string;
  user: UserDto;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponseDto {
  ok: boolean;
  message: string;
}

export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ForgotPasswordResponseDto {
  ok: boolean;
  message: string;
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponseDto {
  ok: boolean;
  message: string;
}