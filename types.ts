
export interface Employee {
  employeeId: string;
  nameAndSurname: string;
  phoneNumber: string;
  address: string;
  email: string;
  grossHourlyWage: number;
  mandatoryMonthlyHours: number;
  holidayDays: number; // Total allowed per year
  photo: string;
}

export interface CompanyInfo {
  name: string;
  email: string;
  appsScriptUrl?: string; // URL for Google Apps Script deployment
}

export interface HolidayEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // ISO Date String (YYYY-MM-DD)
}

export interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // ISO Date String
  timeIn: string; // ISO Time String
  timeOut: string | null; // ISO Time String or null
  totalHours: number;
  breakMinutes?: number; // Minutes spent on break
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
}

export type AppView = 'CLOCK_IN' | 'CLOCKED_IN' | 'HISTORY' | 'ANALYTICS' | 'EMPLOYEES' | 'SETTINGS' | 'HOLIDAYS';
