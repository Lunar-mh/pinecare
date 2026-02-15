/**
 * drug_interaction.ts - 用药交互检查相关API
 */

import { get, post } from '../request';
import type {
  DrugInteractionResult,
  DrugInteractionRecord,
  DrugContraindication,
  DrugFoodInteraction,
} from '../types';

// 检测药物相互作用
export const checkDrugInteraction = (data: { drugList: string[] }) =>
  post<DrugInteractionResult[]>('/drug-interaction/check', data);

// 获取历史检测记录
export const getInteractionHistory = (params?: { status?: 'new' | 'acknowledged' | 'dismissed' }) =>
  get<DrugInteractionRecord[]>('/drug-interaction/history', params);

// 确认已知悉风险
export const acknowledgeRisk = (data: { interactionId: number }) =>
  post<void>('/drug-interaction/acknowledge', data);

// 检测药物禁忌
export const checkContraindication = (params: { drugName: string }) =>
  get<DrugContraindication[]>('/drug-interaction/contraindication', params);

// 药物食物相互作用
export const checkFoodInteraction = (params: { drugName: string }) =>
  get<DrugFoodInteraction[]>('/drug-interaction/food', params);
