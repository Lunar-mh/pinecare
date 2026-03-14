import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { ReactNode, useState, useMemo } from 'react'
import classNames from 'classnames'
import './index.scss'

interface PageShellProps {
  children: ReactNode
  roleTone?: 'elder' | 'family' | 'volunteer' | 'admin'
  className?: string
  loading?: boolean
}

export function PageShell({ children, roleTone = 'elder', className, loading }: PageShellProps) {
  return (
    <View className={classNames('yao-page-shell', `yao-tone-${roleTone}`, className)}>
      <View className="yao-bg-gradient" />
      <ScrollView scrollY className="yao-scroll-view" enhanced showScrollbar={false}>
        <View className="yao-content-inner">
          {children}
        </View>
      </ScrollView>
      {loading && (
        <View className="yao-global-loader">
          <View className="loader-orbit" />
          <Text>同步健康数据中...</Text>
        </View>
      )}
    </View>
  )
}

interface HeroHeaderProps {
  eyebrow: string
  title: string
  subtitle: string
  aside?: ReactNode
  roleTone?: 'elder' | 'family'
}

export function HeroHeader({ eyebrow, title, subtitle, aside, roleTone = 'elder' }: HeroHeaderProps) {
  return (
    <View className={classNames('yao-hero', `yao-hero-${roleTone}`)}>
      <View className="hero-content">
        <Text className="hero-eyebrow">{eyebrow}</Text>
        <Text className="hero-title">{title}</Text>
        <Text className="hero-subtitle">{subtitle}</Text>
      </View>
      {aside && <View className="hero-aside">{aside}</View>}
    </View>
  )
}

interface StatusCardProps {
  title: string
  value: string | number
  unit?: string
  hint?: string
  tone?: 'normal' | 'warning' | 'danger' | 'success' | 'primary' | 'info'
  icon?: ReactNode
  onClick?: () => void
}

export function StatusCard({ title, value, unit, hint, tone = 'normal', icon, onClick }: StatusCardProps) {
  return (
    <View className={classNames('yao-status-card', `card-tone-${tone}`)} onClick={onClick}>
      <View className="card-header">
        {icon && <View className="card-icon">{icon}</View>}
        <Text className="card-title">{title}</Text>
      </View>
      <View className="card-main">
        <Text className="card-value">{value}</Text>
        {unit && <Text className="card-unit">{unit}</Text>}
      </View>
      {hint && <Text className="card-hint">{hint}</Text>}
    </View>
  )
}

interface SectionBlockProps {
  title: string
  description?: string
  children: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function SectionBlock({ title, description, children, actionLabel, onAction }: SectionBlockProps) {
  return (
    <View className="yao-section">
      <View className="section-header">
        <View className="section-title-group">
          <Text className="section-title">{title}</Text>
          {description && <Text className="section-description">{description}</Text>}
        </View>
        {actionLabel && (
          <View className="section-action" onClick={onAction}>
            <Text>{actionLabel}</Text>
            <View className="action-arrow" />
          </View>
        )}
      </View>
      <View className="section-content">
        {children}
      </View>
    </View>
  )
}

interface ActionGridProps {
  items: Array<{ key: string; label: string; icon: ReactNode; badge?: string; description?: string }>
  onSelect: (key: string) => void
  columns?: number
}

export function ActionGrid({ items, onSelect, columns }: ActionGridProps) {
  const style = columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : {}
  return (
    <View className="yao-action-grid" style={style}>
      {items.map(item => (
        <View key={item.key} className="action-item" onClick={() => onSelect(item.key)}>
          <View className="action-icon-wrapper">
            {item.icon}
            {item.badge && <View className="action-badge">{item.badge}</View>}
          </View>
          <Text className="action-label">{item.label}</Text>
          {item.description && <Text className="action-desc">{item.description}</Text>}
        </View>
      ))}
    </View>
  )
}

export function DataPanel({ children, tone = 'normal', className }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <View className={classNames('yao-data-panel', `panel-tone-${tone}`, className)}>
      {children}
    </View>
  )
}

interface StickyActionProps {
  label: string
  icon?: ReactNode
  onClick: () => void
  tone?: 'elder' | 'family'
}

export function StickyPrimaryAction({ label, icon, onClick, tone = 'elder' }: StickyActionProps) {
  return (
    <View className={classNames('yao-sticky-action', `sticky-tone-${tone}`)} onClick={onClick}>
      <View className="sticky-inner">
        {icon && <View className="sticky-icon">{icon}</View>}
        <Text className="sticky-label">{label}</Text>
      </View>
    </View>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon, title, description, action, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <View className={classNames('yao-empty-state', className)}>
      {icon && <View className="empty-icon">{icon}</View>}
      <Text className="empty-title">{title}</Text>
      {description && <Text className="empty-desc">{description}</Text>}
      {action && <View className="empty-action">{action}</View>}
      {actionLabel && (
        <View className="empty-action-btn" onClick={onAction}>
          <Text>{actionLabel}</Text>
        </View>
      )}
    </View>
  )
}
