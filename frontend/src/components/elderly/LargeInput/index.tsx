import React from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import './index.scss';

/**
 * LargeInput 大输入框
 * 适老化设计：68px高度，22px字号，清晰边框，充足内边距
 * 使用场景：表单输入、搜索框
 */
export interface LargeInputProps {
  /** 输入框值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 输入框类型 */
  type?: 'text' | 'number' | 'idcard' | 'digit';
  /** 最大长度 */
  maxLength?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readOnly?: boolean;
  /** 标签文本 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 错误信息 */
  error?: string;
  /** 自定义类名 */
  className?: string;
  /** 聚焦回调 */
  onFocus?: () => void;
  /** 失焦回调 */
  onBlur?: () => void;
}

export const LargeInput: React.FC<LargeInputProps> = ({
  value,
  onChange,
  placeholder = '请输入',
  type = 'text',
  maxLength,
  disabled = false,
  readOnly = false,
  label,
  required = false,
  error,
  className = '',
  onFocus,
  onBlur
}) => {
  return (
    <View className={`large-input-wrapper ${className}`}>
      {label && (
        <View className="large-input__label">
          <Text className="large-input__label-text">
            {label}
            {required && <Text className="large-input__required"> *</Text>}
          </Text>
        </View>
      )}
      <View 
        className={`large-input ${error ? 'large-input--error' : ''} ${disabled ? 'large-input--disabled' : ''}`}
      >
        <Input
          className="large-input__field"
          type={type}
          value={value}
          placeholder={placeholder}
          maxlength={maxLength}
          disabled={disabled || readOnly}
          onInput={(e) => onChange(e.detail.value)}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
      {error && (
        <Text className="large-input__error">{error}</Text>
      )}
    </View>
  );
};

/**
 * LargeTextarea 大文本域
 * 适老化设计：最小120px高度，22px字号，自动调整
 * 使用场景：备注、描述、多行输入
 */
export interface LargeTextareaProps {
  /** 文本值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 最大长度 */
  maxLength?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最小高度 */
  minHeight?: number;
  /** 标签文本 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 错误信息 */
  error?: string;
  /** 自定义类名 */
  className?: string;
}

export const LargeTextarea: React.FC<LargeTextareaProps> = ({
  value,
  onChange,
  placeholder = '请输入',
  maxLength,
  disabled = false,
  minHeight = 120,
  label,
  required = false,
  error,
  className = ''
}) => {
  return (
    <View className={`large-input-wrapper ${className}`}>
      {label && (
        <View className="large-input__label">
          <Text className="large-input__label-text">
            {label}
            {required && <Text className="large-input__required"> *</Text>}
          </Text>
        </View>
      )}
      <View 
        className={`large-textarea ${error ? 'large-textarea--error' : ''} ${disabled ? 'large-textarea--disabled' : ''}`}
        style={{ minHeight: `${minHeight}px` }}
      >
        <Textarea
          className="large-textarea__field"
          value={value}
          placeholder={placeholder}
          maxlength={maxLength}
          disabled={disabled}
          onInput={(e) => onChange(e.detail.value)}
          style={{ minHeight: `${minHeight - 32}px` }}
        />
      </View>
      {error && (
        <Text className="large-input__error">{error}</Text>
      )}
    </View>
  );
};

export default LargeInput;
