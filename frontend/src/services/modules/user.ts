/**
 * user.ts - 用户相关API
 */

import { get, post, put } from '../request';
import type { UserInfo, EmergencyContact, PaginatedResult } from '../types';

// 发送短信验证码
export const sendSmsCode = (phone: string) =>
  post<void>('/auth/sms-code', { phone });

// 微信登录
export const loginByWechat = (code: string) => 
  post<{ token: string; userInfo: UserInfo }>('/auth/wechat', { code });

// 手机号登录
export const loginByPhone = (phone: string, code: string) =>
  post<{ token: string; userInfo: UserInfo }>('/auth/phone', { phone, code });

// 获取用户信息
export const getUserInfo = () =>
  get<UserInfo>('/user/info');

// 更新用户信息
export const updateUserInfo = (data: Partial<UserInfo>) =>
  put<UserInfo>('/user/info', data);

// 上传头像
export const uploadAvatar = (filePath: string) => {
  // 使用Taro.uploadFile
  const { default: Taro } = require('@tarojs/taro');
  return Taro.uploadFile({
    url: '待核验', // 需要后端提供上传接口
    filePath,
    name: 'file'
  });
};

// ==================== 紧急联系人 ====================

// 获取紧急联系人列表
export const getEmergencyContacts = () =>
  get<EmergencyContact[]>('/user/emergency-contacts');

// 添加紧急联系人
export const addEmergencyContact = (data: Omit<EmergencyContact, 'id'>) =>
  post<EmergencyContact>('/user/emergency-contacts', data);

// 更新紧急联系人
export const updateEmergencyContact = (id: string, data: Partial<EmergencyContact>) =>
  put<EmergencyContact>(`/user/emergency-contacts/${id}`, data);

// 删除紧急联系人
export const deleteEmergencyContact = (id: string) =>
  post<void>(`/user/emergency-contacts/${id}/delete`);

// 设置主要联系人
export const setPrimaryContact = (id: string) =>
  put<void>(`/user/emergency-contacts/${id}/primary`);
