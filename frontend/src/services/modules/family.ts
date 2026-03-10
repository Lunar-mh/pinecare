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

export interface VoiceMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar?: string;
  duration: number;
  url: string;
  isRead: boolean;
  createdAt: string;
}

export interface AlbumPhoto {
  id: string;
  url: string;
  thumbUrl?: string;
  description?: string;
  uploadBy: string;
  createdAt: string;
}

// 获取家属端老人总览（家属首页主接口）
export const getElderlyOverview = () =>
  get<ElderlyOverview>('/family/elderly-overview');

// 获取家属绑定列表
export const getFamilyBindings = () =>
  get<FamilyMember[]>('/family/bindings');

// 获取家庭成员列表（family-space路径）
export const getFamilyMembers = () =>
  get<FamilyMember[]>('/family-space/member/list');

// 获取语音留言列表
export const getVoiceMessages = (params?: { page?: number; pageSize?: number }) =>
  get<PaginatedResult<VoiceMessage>>('/family-space/message/list', params);

// 标记留言已读
export const markMessageRead = (id: string) =>
  post<void>(`/family-space/message/${id}/read`, {});

// 获取家庭相册
export const getAlbumPhotos = (params?: { page?: number; pageSize?: number }) =>
  get<PaginatedResult<AlbumPhoto>>('/family-space/album/list', params);

// 上传照片
export const uploadAlbumPhoto = (data: { url: string; description?: string }) =>
  post<AlbumPhoto>('/family-space/album/upload', data);

// 获取未读留言数
export const getUnreadMessageCount = () =>
  get<{ count: number }>('/family-space/message/unread-count');
