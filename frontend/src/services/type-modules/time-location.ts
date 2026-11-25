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
  lat?: number;
  lng?: number;
}
