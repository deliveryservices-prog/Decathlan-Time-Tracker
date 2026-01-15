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
  email: 'hr@decathlan.com',
  updatedAt: 0
};

const formatToHHmm = (isoStr: string | null): string => {
  if (!isoStr || isoStr === '' || isoStr === 'null') return '';
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr; 
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
};

const reconstructISO = (dateStr: string, timeStr: string | null): string | null => {
  if (!timeStr || timeStr === '' || timeStr === '-' || timeStr === 'null') return null;
  if (String(timeStr).includes('T')) return timeStr; 
  try {
    const [hrs, mins] = timeStr.split(':');
    const d = new Date(dateStr);
    d.setHours(parseInt(hrs), parseInt(mins), 0, 0);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
};

/**
 * Merges lists based on unique IDs and 'updatedAt' timestamp.
 * The record with the higher timestamp (most recent edit) wins.
 */
const mergeLists = (local: any[], cloud: any[], idField: string) => {
  const cleanLocal = (local || []).filter(item => item && item[idField]);
  const cleanCloud = (cloud || []).filter(item => item && item[idField]);
  
  const map = new Map<string, any>();
  
  // Strategy: Add all local first, then overwrite with cloud ONLY if cloud is newer.
  // Then add any cloud records that aren't local.
  
  cleanLocal.forEach(item => {
    map.set(item[idField], { ...item, updatedAt: Number(item.updatedAt) || 0 });
  });

  cleanCloud.forEach(cloudItem => {
    const cloudTs = Number(cloudItem.updatedAt) || 0;
    const localItem = map.get(cloudItem[idField]);
    const localTs = localItem ? (Number(localItem.updatedAt) || 0) : -1;

    if (cloudTs >= localTs) {
      map.set(cloudItem[idField], { ...cloudItem, updatedAt: cloudTs });
    }
  });
  
  return Array.from(map.values());
};

export const db = {
  performGlobalSync: async (): Promise<boolean> => {
    const info = db.getCompanyInfo();
    const url = info.appsScriptUrl?.trim();
    if (!url || url.includes('/edit')) return false;

    try {
      // 1. PULL
      const getResponse = await fetch(url, { method: 'GET', cache: 'no-cache', mode: 'cors' });
      if (!getResponse.ok) return false;
      const cloudData = await getResponse.json();

      // Normalize cloud timesheet records
      if (cloudData[KEYS.TIMESHEET] && Array.isArray(cloudData[KEYS.TIMESHEET])) {
        cloudData[KEYS.TIMESHEET] = cloudData[KEYS.TIMESHEET]
          .filter((e: any) => e && e.id)
          .map((entry: any) => ({
            ...entry,
            date: (entry.date || '').split('T')[0],
            timeIn: reconstructISO(entry.date, entry.timeIn) || entry.timeIn,
            timeOut: reconstructISO(entry.date, entry.timeOut) || entry.timeOut,
            breakMinutes: parseInt(entry.breakMinutes) || 0,
            totalHours: parseFloat(entry.totalHours) || 0,
            updatedAt: Number(entry.updatedAt) || 0
          }));
      }

      // 2. MERGE (Timestamp Based)
      const mergedEmployees = mergeLists(db.getEmployees(), cloudData[KEYS.EMPLOYEES], 'employeeId');
      const mergedTimesheet = mergeLists(db.getTimesheet(), cloudData[KEYS.TIMESHEET], 'id');
      const mergedHolidays = mergeLists(db.getHolidays(), cloudData[KEYS.HOLIDAYS], 'id');
      const mergedPH = mergeLists(db.getPublicHolidays(), cloudData[KEYS.PUBLIC_HOLIDAYS], 'id');

      // 3. PERSIST LOCAL
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(mergedEmployees));
      localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(mergedTimesheet));
      localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(mergedHolidays));
      localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(mergedPH));
      
      if (cloudData[KEYS.SETTINGS] && Array.isArray(cloudData[KEYS.SETTINGS]) && cloudData[KEYS.SETTINGS].length > 0) {
        // Special merge for settings if needed, but usually simpler to just take latest
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(cloudData[KEYS.SETTINGS]));
      }

      // 4. PUSH (Clean formatted data for Sheets)
      const formattedTimesheet = mergedTimesheet.map(entry => ({
        ...entry,
        date: entry.date.split('T')[0], 
        timeIn: formatToHHmm(entry.timeIn),
        timeOut: entry.timeOut ? formatToHHmm(entry.timeOut) : null,
        updatedAt: entry.updatedAt
      }));

      const payload = {
        full_sync: true,
        data: {
          [KEYS.EMPLOYEES]: mergedEmployees,
          [KEYS.TIMESHEET]: formattedTimesheet,
          [KEYS.SETTINGS]: db.getSettings(),
          [KEYS.HOLIDAYS]: mergedHolidays,
          [KEYS.PUBLIC_HOLIDAYS]: mergedPH,
          [KEYS.COMPANY]: [db.getCompanyInfo()], 
        }
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return true;
    } catch (e) {
      console.error('Global sync failed', e);
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
      const obj = Array.isArray(parsed) ? parsed[0] : parsed;
      return obj || DEFAULT_COMPANY;
    } catch { return DEFAULT_COMPANY; }
  },

  updateCompanyInfo: (info: CompanyInfo): void => {
    const updated = { ...info, updatedAt: Date.now() };
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(updated));
  },

  saveEmployee: (employee: Employee): void => {
    const employees = db.getEmployees();
    employees.push({ ...employee, updatedAt: Date.now() });
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  updateEmployee: (updatedEmployee: Employee): void => {
    const employees = db.getEmployees();
    const index = employees.findIndex(e => e.employeeId === updatedEmployee.employeeId);
    if (index !== -1) {
      employees[index] = { ...updatedEmployee, updatedAt: Date.now() };
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
    }
  },

  deleteEmployee: (employeeId: string): void => {
    const employees = db.getEmployees().filter(e => e.employeeId !== employeeId);
    localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  },

  getTimesheet: (): TimesheetEntry[] => {
    const data = localStorage.getItem(KEYS.TIMESHEET);
    return data ? JSON.parse(data) : [];
  },

  getSettings: (): Setting[] => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : [];
    return (Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_SETTINGS;
  },

  updateTimesheetEntry: (updatedEntry: TimesheetEntry): void => {
    const timesheet = db.getTimesheet();
    const index = timesheet.findIndex(t => t.id === updatedEntry.id);
    if (index !== -1) {
      timesheet[index] = { ...updatedEntry, updatedAt: Date.now() };
      localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(timesheet));
    }
  },

  deleteTimesheetEntry: (id: string): void => {
    const timesheet = db.getTimesheet().filter(t => t.id !== id);
    localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(timesheet));
  },

  updateSettings: (settings: Setting[]) => {
    const updated = settings.map(s => ({ ...s, updatedAt: Date.now() }));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  },

  getHolidays: (): HolidayEntry[] => {
    const data = localStorage.getItem(KEYS.HOLIDAYS);
    return data ? JSON.parse(data) : [];
  },

  saveHoliday: (holiday: HolidayEntry) => {
    const holidays = db.getHolidays();
    holidays.push({ ...holiday, updatedAt: Date.now() });
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
  },

  updateHoliday: (holiday: HolidayEntry) => {
    const holidays = db.getHolidays();
    const index = holidays.findIndex(h => h.id === holiday.id);
    if (index !== -1) {
      holidays[index] = { ...holiday, updatedAt: Date.now() };
      localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
    }
  },

  deleteHoliday: (id: string) => {
    const holidays = db.getHolidays().filter(h => h.id !== id);
    localStorage.setItem(KEYS.HOLIDAYS, JSON.stringify(holidays));
  },

  getPublicHolidays: (): PublicHoliday[] => {
    const data = localStorage.getItem(KEYS.PUBLIC_HOLIDAYS);
    return data ? JSON.parse(data) : [];
  },

  savePublicHoliday: (holiday: PublicHoliday) => {
    const holidays = db.getPublicHolidays();
    holidays.push({ ...holiday, updatedAt: Date.now() });
    localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
  },

  updatePublicHoliday: (ph: PublicHoliday) => {
    const holidays = db.getPublicHolidays();
    const index = holidays.findIndex(p => p.id === ph.id);
    if (index !== -1) {
      holidays[index] = { ...ph, updatedAt: Date.now() };
      localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
    }
  },

  deletePublicHoliday: (id: string) => {
    const holidays = db.getPublicHolidays().filter(h => h.id !== id);
    localStorage.setItem(KEYS.PUBLIC_HOLIDAYS, JSON.stringify(holidays));
  },

  clockIn: async (employeeIds: string[], customTimestamp?: string): Promise<void> => {
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
        breakMinutes: 0,
        updatedAt: Date.now()
      };
    });

    localStorage.setItem(KEYS.TIMESHEET, JSON.stringify([...currentTimesheet, ...newEntries]));
  },

  clockOut: async (entryId: string, customTimestamp?: string, breakMinutes: number = 0): Promise<void> => {
    const currentTimesheet = db.getTimesheet();
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const updated = currentTimesheet.map(entry => {
      if (entry.id === entryId) {
        const timeIn = new Date(entry.timeIn);
        const diffMs = now.getTime() - timeIn.getTime();
        const breakMs = (breakMinutes || 0) * 60 * 1000;
        const netMs = diffMs - breakMs;
        const diffHrs = parseFloat((netMs / (1000 * 60 * 60)).toFixed(2));
        return {
          ...entry,
          timeOut: now.toISOString(),
          totalHours: Math.max(0, diffHrs),
          breakMinutes: breakMinutes,
          updatedAt: Date.now()
        };
      }
      return entry;
    });
    
    localStorage.setItem(KEYS.TIMESHEET, JSON.stringify(updated));
  }
};