export interface Doctor {
  id: string;
  name: string;
  title: string;
  department: string;
  hospital: string;
  avatar?: string;
  rating: number;
  consultationFee: number;
  isOnline: boolean;
  tags: string[];
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  department: string;
  hospital: string;
  scheduledAt: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: 'online' | 'offline';
}

export interface MedicalReport {
  id: string;
  title: string;
  hospital: string;
  reportDate: string;
  type: 'blood' | 'imaging' | 'ecg' | 'other';
  fileUrl: string;
}
