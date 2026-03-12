export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: MedicationSchedule[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  reminderTime: number;
  isActive: boolean;
}

export interface MedicationSchedule {
  time: string;
  dosage: string;
}

export interface MedicationRecord {
  id: string;
  medicationId: string;
  scheduledTime: string;
  takenAt?: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  note?: string;
}

export interface TodayMedication {
  logId?: string;
  medicationId: string;
  name: string;
  dosage: string;
  time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  takenAt?: string;
  scheduledTime?: string;
}
