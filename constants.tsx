
import { Employee, Setting, TaxType } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    employeeId: 'EMP001',
    nameAndSurname: 'John Smith',
    phoneNumber: '+357 99 123456',
    address: '123 Athalassa Ave, Nicosia',
    email: 'john.smith@example.com',
    grossHourlyWage: 15.50,
    mandatoryMonthlyHours: 160,
    holidayDays: 22,
    photo: 'https://picsum.photos/seed/john/200',
  },
  {
    employeeId: 'EMP002',
    nameAndSurname: 'Eleni Nicolaou',
    phoneNumber: '+357 99 654321',
    address: '45 Limassol Marina, Limassol',
    email: 'eleni.n@example.com',
    grossHourlyWage: 18.00,
    mandatoryMonthlyHours: 152,
    holidayDays: 20,
    photo: 'https://picsum.photos/seed/eleni/200',
  },
  {
    employeeId: 'EMP003',
    nameAndSurname: 'Marcus Aurelius',
    phoneNumber: '+357 99 000111',
    address: '7 Philosophers Way, Paphos',
    email: 'marcus@stoic.com',
    grossHourlyWage: 25.00,
    mandatoryMonthlyHours: 160,
    holidayDays: 25,
    photo: 'https://picsum.photos/seed/marcus/200',
  }
];

export const INITIAL_SETTINGS: Setting[] = [
  { taxType: TaxType.SocialInsuranceEmployee, percentage: 8.8 },
  { taxType: TaxType.SocialInsuranceEmployer, percentage: 8.8 },
  { taxType: TaxType.GesyEmployee, percentage: 2.65 },
  { taxType: TaxType.GesyEmployer, percentage: 2.9 },
  { taxType: TaxType.Cohesion, percentage: 2.0 },
  { taxType: TaxType.Redundancy, percentage: 1.2 },
  { taxType: TaxType.Industrial, percentage: 0.5 },
];
