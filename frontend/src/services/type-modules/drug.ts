export type DrugInteractionLevel = 'X' | 'D' | 'C' | 'B' | 'A';

export interface DrugInteractionResult {
  drugA: string;
  drugB: string;
  level: DrugInteractionLevel;
  mechanism?: string;
  description?: string;
}

export interface DrugInteractionRecord {
  id: number;
  drugA: string;
  drugB: string;
  level: DrugInteractionLevel;
  riskDescription?: string;
  suggestion?: string;
  detectedAt: string;
  status: 'new' | 'acknowledged' | 'dismissed';
}

export interface DrugContraindication {
  drugName: string;
  diseaseName: string;
  severity: 'high' | 'medium' | 'low';
  description?: string;
}

export interface DrugFoodInteraction {
  foodName: string;
  interactionType: string;
  description?: string;
  suggestion?: string;
}
