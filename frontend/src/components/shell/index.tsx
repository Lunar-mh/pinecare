import type { PropsWithChildren, ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

type RoleTone = 'elder' | 'family'
type StatusTone = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface PageShellProps extends PropsWithChildren {
  roleTone?: RoleTone
  className?: string
}

export function PageShell({ roleTone = 'elder', className = '', children }: PageShellProps) {
  return <View className={`page-shell page-shell--${roleTone}${className ? ` ${className}` : ''}`}>{children}</View>
}

export interface HeroHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  aside?: ReactNode
  roleTone?: RoleTone
}

export function HeroHeader({ eyebrow, title, subtitle, aside, roleTone = 'elder' }: HeroHeaderProps) {
  return (
    <View className={`hero-header hero-header--${roleTone}`}>
      <View className="hero-header__body">
        {eyebrow ? <Text className="hero-header__eyebrow">{eyebrow}</Text> : null}
        <Text className="hero-header__title">{title}</Text>
        {subtitle ? <Text className="hero-header__subtitle">{subtitle}</Text> : null}
      </View>
      {aside ? <View className="hero-header__aside">{aside}</View> : null}
    </View>
  )
}

export interface SectionBlockProps extends PropsWithChildren {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function SectionBlock({ title, description, actionLabel, onAction, children }: SectionBlockProps) {
  return (
    <View className="section-block">
      <View className="section-block__head">
        <View>
          <Text className="section-block__title">{title}</Text>
          {description ? <Text className="section-block__description">{description}</Text> : null}
        </View>
        {actionLabel ? (
          <View className="section-block__action" onClick={onAction}>
            <Text>{actionLabel}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export interface StatusCardProps {
  title: string
  value: string
  unit?: string
  hint?: string
  tone?: StatusTone
  icon?: ReactNode
  onClick?: () => void
}

export function StatusCard({ title, value, unit, hint, tone = 'primary', icon, onClick }: StatusCardProps) {
  return (
    <View className={`status-card status-card--${tone}${onClick ? ' status-card--clickable' : ''}`} onClick={onClick}>
      <View className="status-card__top">
        <Text className="status-card__title">{title}</Text>
        {icon ? <View className="status-card__icon">{icon}</View> : null}
      </View>
      <View className="status-card__value-row">
        <Text className="status-card__value">{value}</Text>
        {unit ? <Text className="status-card__unit">{unit}</Text> : null}
      </View>
      {hint ? <Text className="status-card__hint">{hint}</Text> : null}
    </View>
  )
}

export interface DataPanelProps extends PropsWithChildren {
  tone?: StatusTone
}

export function DataPanel({ tone = 'primary', children }: DataPanelProps) {
  return <View className={`data-panel data-panel--${tone}`}>{children}</View>
}

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="empty-state">
      {icon ? <View className="empty-state__icon">{icon}</View> : null}
      <Text className="empty-state__title">{title}</Text>
      {description ? <Text className="empty-state__description">{description}</Text> : null}
      {actionLabel ? (
        <View className="empty-state__action" onClick={onAction}>
          <Text>{actionLabel}</Text>
        </View>
      ) : null}
    </View>
  )
}

export interface ActionGridItem {
  key: string
  label: string
  description: string
  icon: ReactNode
  badge?: string
}

export interface ActionGridProps {
  items: ActionGridItem[]
  columns?: 2 | 3
  onSelect?: (key: string) => void
}

export function ActionGrid({ items, columns = 2, onSelect }: ActionGridProps) {
  return (
    <View className={`action-grid action-grid--cols-${columns}`}>
      {items.map(item => (
        <View key={item.key} className="action-grid__item" onClick={() => onSelect?.(item.key)}>
          {item.badge ? (
            <View className="action-grid__badge">
              <Text>{item.badge}</Text>
            </View>
          ) : null}
          <View className="action-grid__icon">{item.icon}</View>
          <Text className="action-grid__label">{item.label}</Text>
          <Text className="action-grid__description">{item.description}</Text>
        </View>
      ))}
    </View>
  )
}

export interface StickyPrimaryActionProps {
  label: string
  icon?: ReactNode
  onClick: () => void
  tone?: RoleTone
}

export function StickyPrimaryAction({ label, icon, onClick, tone = 'elder' }: StickyPrimaryActionProps) {
  return (
    <View className="sticky-action">
      <View className={`sticky-action__button sticky-action__button--${tone}`} onClick={onClick}>
        {icon ? <View className="sticky-action__icon">{icon}</View> : null}
        <Text className="sticky-action__label">{label}</Text>
      </View>
    </View>
  )
}
