export interface TimeBankAccount {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  level: number;
  title: string;
}

export interface ServiceRequest {
  id: string;
  type: string;
  description: string;
  duration: number;
  location: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  requesterId: string;
  providerId?: string;
  createdAt: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  updatedAt: string;
}

export interface SafeZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}
