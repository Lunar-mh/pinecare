/**
 * family.ts - 家庭空间相关API
 */

import { get, post } from '../request';
import type { PaginatedResult } from '../types';

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

// 获取家庭成员列表
export const getFamilyMembers = () =>
  get<FamilyMember[]>('/family/members');

// 获取语音留言列表
export const getVoiceMessages = (params?: { page?: number; pageSize?: number }) =>
  get<PaginatedResult<VoiceMessage>>('/family/voice-messages', params);

// 标记留言已读
export const markMessageRead = (id: string) =>
  post<void>(`/family/voice-messages/${id}/read`, {});

// 获取家庭相册
export const getAlbumPhotos = (params?: { page?: number; pageSize?: number }) =>
  get<PaginatedResult<AlbumPhoto>>('/family/album', params);

// 上传照片
export const uploadAlbumPhoto = (data: { url: string; description?: string }) =>
  post<AlbumPhoto>('/family/album', data);

// 获取未读留言数
export const getUnreadMessageCount = () =>
  get<{ count: number }>('/family/voice-messages/unread-count');
