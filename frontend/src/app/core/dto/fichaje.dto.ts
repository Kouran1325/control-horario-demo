export interface CurrentEntryDto {
  id: string;
  startAt: string;
  endAt?: string | null;
  latStart?: number | null;
  lonStart?: number | null;
  latEnd?: number | null;
  lonEnd?: number | null;
  accuracyStart?: number | null;
  accuracyEnd?: number | null;
  closedByAdmin?: boolean;
  closeReason?: string | null;
  closeMethod?: string | null;
}

export interface FichajeStatusResponseDto {
  status: 'IN' | 'OUT';
  openEntry: CurrentEntryDto | null;
}

export interface FichajeLocationDto {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

export interface FichajeSummaryEntryDto {
  startAt: string;
  endAt: string;
  minutes: number;

  latStart: number | null;
  lonStart: number | null;
  latEnd: number | null;
  lonEnd: number | null;
  accuracyStart: number | null;
  accuracyEnd: number | null;
}

export interface FichajeSummaryDayDto {
  date: string;
  minutes: number;
  hours: number;
  entries: FichajeSummaryEntryDto[];
}

export interface FichajeSummaryResponseDto {
  ok: boolean;
  from: string;
  to: string;
  status: 'IN' | 'OUT';
  openEntry: CurrentEntryDto | null;
  totalMinutes: number;
  totalHours: number;
  daysWorked: number;
  days: FichajeSummaryDayDto[];
}