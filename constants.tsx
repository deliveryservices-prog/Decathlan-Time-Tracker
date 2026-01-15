import { Employee, Setting, TaxType } from './types';

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_SETTINGS: Setting[] = [
  { taxType: TaxType.SocialInsuranceEmployee, percentage: 8.8 },
  { taxType: TaxType.SocialInsuranceEmployer, percentage: 8.8 },
  { taxType: TaxType.GesyEmployee, percentage: 2.65 },
  { taxType: TaxType.GesyEmployer, percentage: 2.9 },
  { taxType: TaxType.Cohesion, percentage: 2.0 },
  { taxType: TaxType.Redundancy, percentage: 1.2 },
  { taxType: TaxType.Industrial, percentage: 0.5 },
];