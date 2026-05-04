export interface AdminUserDto {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponseDto {
  ok: boolean;
  users: AdminUserDto[];
}

export interface AdminUserResponseDto {
  ok: boolean;
  user: AdminUserDto;
}

export interface AdminCreateUserRequestDto {
  name?: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
}

export interface AdminUpdateUserRequestDto {
  enabled?: boolean;
  role?: 'ADMIN' | 'USER';
}

export interface AdminOpenTimeEntryUserDto {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
}

export interface AdminOpenTimeEntryDto {
  id: string;
  userId: string;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminOpenTimeEntryUserDto;
}

export interface AdminOpenTimeEntriesResponseDto {
  ok: boolean;
  totalOpen: number;
  openEntries: AdminOpenTimeEntryDto[];
}

export interface AdminForceStopRequestDto {
  reason?: string;
}

export interface AdminTimeEntryUserDto {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
  enabled: boolean;
}

export interface AdminTimeEntryDto {
  id: string;
  userId: string;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  durationMinutes: number | null;

  latStart: number | null;
  lonStart: number | null;
  accuracyStart: number | null;
  latEnd: number | null;
  lonEnd: number | null;
  accuracyEnd: number | null;

  createdByAdmin: boolean;
  createdByAdminId: string | null;
  createReason: string | null;

  editedByAdmin: boolean;
  editedByAdminId: string | null;
  editReason: string | null;
  editedAt: string | null;

  voidedByAdmin: boolean;
  voidedByAdminId: string | null;
  voidReason: string | null;
  voidedAt: string | null;

  closedByAdmin: boolean;
  closedByAdminId: string | null;
  closeReason: string | null;
  closeMethod: string | null;

  entryMethod: string;

  hash: string | null;
  isTampered: boolean;

  user: AdminTimeEntryUserDto;
}

export interface AdminTimeEntriesResponseDto {
  ok: boolean;
  from: string;
  to: string;
  userId: string | null;
  totalMinutes: number;
  totalHours: number;
  entries: AdminTimeEntryDto[];
}

export interface AdminCreateManualTimeEntryRequestDto {
  userId: string;
  startAt: string;
  endAt: string | null;
  reason: string;
}

export interface AdminEditTimeEntryRequestDto {
  startAt?: string;
  endAt?: string | null;
  reason: string;
}

export interface AdminTimeEntryResponseDto {
  ok: boolean;
  message: string;
  timeEntry: AdminTimeEntryDto;
}

export interface AdminVoidTimeEntryRequestDto {
  reason: string;
}