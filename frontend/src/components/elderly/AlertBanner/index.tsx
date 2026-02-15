import React from 'react';
import { View, Text } from '@tarojs/components';
import { Warning, Failure, Tips, Checked, Close } from '@nutui/icons-react-taro';
import './index.scss';

/**
 * AlertBanner 警告横幅
 * 适老化设计：大字号、醒目颜色、充足内边距
 * 使用场景：健康异常提醒、紧急通知、用药提醒
 */
export type AlertType = 'warning' | 'danger' | 'info' | 'success';

export interface AlertBannerProps {
  type?: AlertType;
  title: string;
  message?: string;
  closable?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

const typeConfig: Record<AlertType, { bg: string; border: string; iconColor: string }> = {
  warning: {
    bg: '#FFF8E1',
    border: '#FFB300',
    iconColor: '#F57C00'
  },
  danger: {
    bg: '#FFEBEE',
    border: '#EF5350',
    iconColor: '#C62828'
  },
  info: {
    bg: '#E3F2FD',
    border: '#42A5F5',
    iconColor: '#1565C0'
  },
  success: {
    bg: '#E8F5E9',
    border: '#66BB6A',
    iconColor: '#2E7D32'
  }
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'warning',
  title,
  message,
  closable = false,
  onClose,
  onClick,
  className = ''
}) => {
  const config = typeConfig[type];

  const renderIcon = () => {
    const props = { color: config.iconColor, size: 28 };
    switch (type) {
      case 'danger':
        return <Failure {...props} />;
      case 'info':
        return <Tips {...props} />;
      case 'success':
        return <Checked {...props} />;
      case 'warning':
      default:
        return <Warning {...props} />;
    }
  };

  return (
    <View
      className={`alert-banner alert-banner--${type} ${className}`}
      style={{ backgroundColor: config.bg, borderLeftColor: config.border }}
      onClick={onClick}
      role="alert"
      aria-live="polite"
    >
      <View className="alert-banner__content">
        <View className="alert-banner__icon">{renderIcon()}</View>
        <View className="alert-banner__text">
          <Text className="alert-banner__title">{title}</Text>
          {message && <Text className="alert-banner__message">{message}</Text>}
        </View>
      </View>
      {closable && (
        <View
          className="alert-banner__close"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          role="button"
          aria-label="关闭"
        >
          <Close color="#666" size={20} />
        </View>
      )}
    </View>
  );
};

export default AlertBanner;
