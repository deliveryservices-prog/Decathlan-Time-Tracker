
import { Employee, TimesheetEntry, Setting, HolidayEntry, CompanyInfo, PublicHoliday } from './types';
import { INITIAL_EMPLOYEES, INITIAL_SETTINGS } from './constants';

const KEYS = {
  EMPLOYEES: 'Employees',
  TIMESHEET: 'Timesheet',
  SETTINGS: 'Settings',
  HOLIDAYS: 'Holidays',
  PUBLIC_HOLIDAYS: 'Public Holidays',
  COMPANY: 'Company',
};

const DEFAULT_COMPANY: CompanyInfo = {
  name: 'Decathlan HR Services',
  email: 'hr@decathlan.com'
};

const formatToHHmm = (isoStr: string | null): string => {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
};

const reconstructISO = (dateStr: string, timeStr: string | null): string | null => {
  if (!timeStr || timeStr === '' || timeStr === '-') return null;
  try {
    if (String(timeStr).includes('T')) return timeStr;
    const combined = `${dateStr}T${timeStr}:00`;
    const d = new Date(combined);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
};

const getCleanUrl = (url?: string): string | null => {
  if (!url) return null;
  let clean = url.trim();
  if (clean.includes('/edit') || clean.includes('/d/')) return null;
  return clean;
};

export const db = {
  syncWithCloud: async (): Promise<boolean> => {
    const info = db.getCompanyInfo();
    const url = getCleanUrl(info.appsScriptUrl);
    if (!url) return false;

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'cors'
      });
      
      if (!response.ok) return false;
      const cloudData = await response.json();

      // Time conversion logic to ensure durations work in-app
      if (cloudData[KEYS.TIMESHEET] && Array.isArray(cloudData[KEYS.TIMESHEET])) {
        cloudData[KEYS.TIMESHEET] = cloudData[KEYS.TIMESHEET].map((entry: any) => ({
          ...entry,
          timeIn: reconstructISO(entry.date, entry.timeIn) || entry.timeIn,
          timeOut: reconstructISO(entry.date, entry.timeOut) || entry.timeOut,
          breakMinutes: parseInt(entry.breakMinutes) || 0,
          totalHours: parseFloat(entry.totalHours) || 0
        }));
      }

      Object.keys(KEYS).forEach(k => {
        const storageKey = (KEYS as any)[k];
        if (cloudData[storageKey] && Array.isArray(cloudData[storageKey])) {
          localStorage.setItem(storageKey, JSON.stringify(cloudData[storageKey]));
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  pushToCloud: async (): Promise<boolean> => {
    const info = db.getCompanyInfo();
    const url = getCleanUrl(info.appsScriptUrl);
    if (!url) return false;

    // Formatting timesheet back to HH:mm for Google Sheets readability
    const formattedTimesheet = db.getTimesheet().map(entry => ({
      ...entry,
      timeIn: formatToHHmm(entry.timeIn),
      timeOut: entry.timeOut ? formatToHHmm(entry.timeOut) : null
    }));

    // MATCHING "MASTER SCRIPT V7" PAYLOAD STRUCTURE
    const fullPayload = {
      full_sync: true,
      data: {
        [KEYS.EMPLOYEES]: db.getEmployees(),
        [KEYS.TIMESHEET]: formattedTimesheet,
        [KEYS.SETTINGS]: db.getSettings(),
        [KEYS.HOLIDAYS]: db.getHolidays(),
        [KEYS.PUBLIC_HOLIDAYS]: db.getPublicHolidays(),
        [KEYS.COMPANY]: [db.getCompanyInfo()], 
      }
    };

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // standard for silent success with Apps Script
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload),
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  getEmployees: (): Employee[] => {
    const data = localStorage.getItem(KEYS.EMPLOYEES);
    return data ? JSON.parse(data) : INITIAL_EMPLOYEES;
  },

  getCompanyInfo: (): CompanyInfo => {
    const data = localStorage.getItem(KEYS.COMPANY);
    if (!data) return DEFAULT_COMPANY;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    } catch { return DEFAULT_COMPANY; }
  },

  updateCompanyInfo: (info: CompanyInfo): void => {
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(info));
    db.pushToCloud();
  },

  saveEmployee: (employee: Employee): void => {
    const employees = db.getEmployees();
    employees.push(employee);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    db.pushToCloud();
  },

  updateEmployee: (updatedEmployee: Employee): void => {
    const employees = db.getEmployees();
    const index = employees.findIndex(e => e.employeeId === updatedEmployee.employeeId);
    if (index !== -1) {
      employees[index] = updatedEmployee;
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
      db.pushToCloud();
    }
  },

  deleteEmployee: (employeeId: string): void => {
    const employees = db.getEmployees().filter(e => e.employeeId !== employeeId);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    db.pushToCloud();
  },

  getTimesheet: (): TimesheetEntry[] => {
    const data = localStorage.getItem(KEYS.TIMESHEET);
    return data ? JSON.parse(data) : [];
  },

  getSettings: (): Setting[] => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  },

  saveTimesheet: (entries: TimesheetEntry[]) => {
    localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(entries));
    db.pushToCloud();
  },

  updateTimesheetEntry: (updatedEntry: TimesheetEntry): void => {
    const timesheet = db.getTimesheet();
    const index = timesheet.findIndex(t => t.id === updatedEntry.id);
    if (index !== -1) {
      timesheet[index] = updatedEntry;
      db.saveTimesheet(timesheet);
    }
  },

  deleteTimesheetEntry: (id: string): void => {
    const timesheet = db.getTimesheet().filter(t => t.id !== id);
    db.saveTimesheet(timesheet);
  },

  updateSettings: (settings: Setting[]) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    db.pushToCloud();
  },

  getHolidays: (): HolidayEntry[] => {
    const data = localStorage.getItem(KEYS.HOLIDAYS);
    return data ? JSON.parse(data) : [];
  },

  saveHoliday: (holiday: HolidayEntry) => {
    const holidays = db.getHolidays();
    holidays.push(holiday);
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
    db.pushToCloud();
  },

  updateHoliday: (holiday: HolidayEntry) => {
    const holidays = db.getHolidays();
    const index = holidays.findIndex(h => h.id === holiday.id);
    if (index !== -1) {
      holidays[index] = holiday;
      localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
      db.pushToCloud();
    }
  },

  deleteHoliday: (id: string) => {
    const holidays = db.getHolidays().filter(h => h.id !== id);
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
    db.pushToCloud();
  },

  getPublicHolidays: (): PublicHoliday[] => {
    const data = localStorage.getItem(KEYS.PUBLIC_HOLIDAYS);
    return data ? JSON.parse(data) : [];
  },

  savePublicHoliday: (holiday: PublicHoliday) => {
    const holidays = db.getPublicHolidays();
    holidays.push(holiday);
    localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
    db.pushToCloud();
  },

  updatePublicHoliday: (ph: PublicHoliday) => {
    const holidays = db.getPublicHolidays();
    const index = holidays.findIndex(p => p.id === ph.id);
    if (index !== -1) {
      holidays[index] = ph;
      localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
      db.pushToCloud();
    }
  },

  deletePublicHoliday: (id: string) => {
    const holidays = db.getPublicHolidays().filter(h => h.id !== id);
    localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
    db.pushToCloud();
  },

  clockIn: (employeeIds: string[], customTimestamp?: string): void => {
    const currentTimesheet = db.getTimesheet();
    const employees = db.getEmployees();
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    
    const newEntries: TimesheetEntry[] = employeeIds.map(id => {
      const emp = employees.find(e => e.employeeId === id);
      return {
        id: crypto.randomUUID(),
        employeeId: id,
        employeeName: emp ? emp.nameAndSurname : 'Unknown',
        date: now.toISOString().split('T')[0],
        timeIn: now.toISOString(),
        timeOut: null,
        totalHours: 0,
        breakMinutes: 0
      };
    });

    db.saveTimesheet([...currentTimesheet, ...newEntries]);
  },

  clockOut: (entryId: string, customTimestamp?: string, breakMinutes: number = 0): void => {
    const currentTimesheet = db.getTimesheet();
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const updated = currentTimesheet.map(entry => {
      if (entry.id === entryId) {
        const timeIn = new Date(entry.timeIn);
        const diffMs = now.getTime() - timeIn.getTime();
        const breakMs = breakMinutes * 60 * 1000;
        const netMs = diffMs - breakMs;
        const diffHrs = parseFloat((netMs / (1000 * 60 * 60)).toFixed(2));
        return {
          ...entry,
          timeOut: now.toISOString(),
          totalHours: Math.max(0, diffHrs),
          breakMinutes: breakMinutes
        };
      }
      return entry;
    });
    db.saveTimesheet(updated);
  }
};
