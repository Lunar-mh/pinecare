/**
 * family.ts - 家庭空间相关API
 */

import { get, post } from '../request';
import type { PaginatedResult } from '../types';
import type { ElderlyOverview } from '../types';

export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  relation: string;
  isOnline: boolean;
  lastActiveAt: string;
  phone: string;
}

// 获取家属端老人总览（家属首页主接口）
export const getElderlyOverview = () =>
  get<ElderlyOverview>('/family/elderly-overview');

// 获取家属绑定列表
export const getFamilyBindings = () =>
  get<FamilyMember[]>('/family/bindings');

