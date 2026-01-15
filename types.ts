export interface Employee {
  employeeId: string;
  nameAndSurname: string;
  phoneNumber: string;
  address: string;
  email: string;
  grossHourlyWage: number;
  mandatoryMonthlyHours: number;
  holidayDays: number;
  photo: string;
  updatedAt?: number;
}

export interface CompanyInfo {
  name: string;
  email: string;
  appsScriptUrl?: string;
  updatedAt?: number;
}

export interface HolidayEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  updatedAt?: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  updatedAt?: number;
}

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  timeIn: string;
  timeOut: string | null;
  totalHours: number;
  breakMinutes?: number;
  updatedAt?: number;
}

export enum TaxType {
  SocialInsuranceEmployee = 'Social Insurance Employee',
  SocialInsuranceEmployer = 'Social Insurance Employer',
  Cohesion = 'Social Cohesion Fund',
  Redundancy = 'Redundancy Fund',
  Industrial = 'Industrial Training',
  GesyEmployee = 'GESY (Healthcare)Employee',
  GesyEmployer = 'GESY (Healthcare)Employer',
}

export interface Setting {
  taxType: TaxType;
  percentage: number;
  updatedAt?: number;
}

export type AppView = 'CLOCK_IN' | 'CLOCKED_IN' | 'HISTORY' | 'ANALYTICS' | 'EMPLOYEES' | 'SETTINGS' | 'HOLIDAYS';