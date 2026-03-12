import { View } from '@tarojs/components'
import {
  configure,
  HeartFill,
  Health,
  Warning,
  Voice,
  Scan,
  Service,
  Location,
  User,
  Message,
  Clock,
  Checked,
  Close,
  Add,
  Minus,
  Search,
  ArrowRight,
  ArrowLeft,
  Setting,
  Eye,
  EyeF,
  Home,
  Category,
  PhoneF,
  Notice,
  Tips,
  Check,
  Transit,
  List,
} from '@nutui/icons-react-taro'

configure({
  // 微信小程序运行时没有HTML i标签的内置模板
  // 强制NutUI图标渲染为view以避免tmpl_0_i未找到错误
  tag: 'view',
})

// 图标名称类型
export type IconName =
  | 'heart'
  | 'pill'
  | 'sos'
  | 'mic'
  | 'robot'
  | 'family'
  | 'stethoscope'
  | 'user'
  | 'activity'
  | 'check'
  | 'chevron-right'
  | 'home'
  | 'services'
  | 'profile'
  | 'phone'
  | 'location'
  | 'calendar'
  | 'clock'
  | 'alert'
  | 'info'
  | 'arrow-left'
  | 'arrow-right'
  | 'plus'
  | 'minus'
  | 'search'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'settings'
  | 'transit'
  | 'order'
interface IconProps {
  name: IconName
  size?: number
  color?: string
  className?: string
  onClick?: () => void
}

// NutUI icon 映射�?// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<IconName, React.ComponentType<any>> = {
  heart: HeartFill,
  pill: Health,
  sos: Warning,
  mic: Voice,
  robot: Scan,
  family: User,
  stethoscope: Service,
  user: User,
  activity: HeartFill,
  check: Checked,
  'chevron-right': ArrowRight,
  home: Home,
  services: Category,
  profile: User,
  phone: PhoneF,
  location: Location,
  calendar: Clock,
  clock: Clock,
  alert: Notice,
  info: Tips,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  plus: Add,
  minus: Minus,
  search: Search,
  close: Close,
  eye: Eye,
  'eye-off': EyeF,
  settings: Setting,
  transit: Transit,
  order: List,
}

/**
 * 图标组件 - 基于NutUI icons-react-taro
 * 不使用<svg>标签，避免微信小程序tmpl_0_svg编译错误
 */
export function Icon({ name, size = 24, color = 'currentColor', className = '', onClick }: IconProps) {
  const NutIcon = ICON_MAP[name]

  if (!NutIcon) {
    console.warn(`Icon "${name}" not found`)
    return null
  }

  return (
    <View
      className={`icon icon--${name}${onClick ? ' icon--clickable' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <NutIcon size={size} color={color} />
    </View>
  )
}

// 便捷组件
export const HeartIcon = (props: Omit<IconProps, 'name'>) => <Icon name="heart" {...props} />
export const PillIcon = (props: Omit<IconProps, 'name'>) => <Icon name="pill" {...props} />
export const SosIcon = (props: Omit<IconProps, 'name'>) => <Icon name="sos" {...props} />
export const MicIcon = (props: Omit<IconProps, 'name'>) => <Icon name="mic" {...props} />
export const RobotIcon = (props: Omit<IconProps, 'name'>) => <Icon name="robot" {...props} />
export const FamilyIcon = (props: Omit<IconProps, 'name'>) => <Icon name="family" {...props} />
export const StethoscopeIcon = (props: Omit<IconProps, 'name'>) => <Icon name="stethoscope" {...props} />
export const UserIcon = (props: Omit<IconProps, 'name'>) => <Icon name="user" {...props} />
export const ActivityIcon = (props: Omit<IconProps, 'name'>) => <Icon name="activity" {...props} />
export const CheckIcon = (props: Omit<IconProps, 'name'>) => <Icon name="check" {...props} />
export const ChevronRightIcon = (props: Omit<IconProps, 'name'>) => <Icon name="chevron-right" {...props} />
export const HomeIcon = (props: Omit<IconProps, 'name'>) => <Icon name="home" {...props} />
export const ServicesIcon = (props: Omit<IconProps, 'name'>) => <Icon name="services" {...props} />
export const ProfileIcon = (props: Omit<IconProps, 'name'>) => <Icon name="profile" {...props} />
export const PhoneIcon = (props: Omit<IconProps, 'name'>) => <Icon name="phone" {...props} />
export const LocationIcon = (props: Omit<IconProps, 'name'>) => <Icon name="location" {...props} />
export const CalendarIcon = (props: Omit<IconProps, 'name'>) => <Icon name="calendar" {...props} />
export const ClockIcon = (props: Omit<IconProps, 'name'>) => <Icon name="clock" {...props} />
export const AlertIcon = (props: Omit<IconProps, 'name'>) => <Icon name="alert" {...props} />
export const InfoIcon = (props: Omit<IconProps, 'name'>) => <Icon name="info" {...props} />
export const ArrowLeftIcon = (props: Omit<IconProps, 'name'>) => <Icon name="arrow-left" {...props} />
export const ArrowRightIcon = (props: Omit<IconProps, 'name'>) => <Icon name="arrow-right" {...props} />
export const PlusIcon = (props: Omit<IconProps, 'name'>) => <Icon name="plus" {...props} />
export const MinusIcon = (props: Omit<IconProps, 'name'>) => <Icon name="minus" {...props} />
export const SearchIcon = (props: Omit<IconProps, 'name'>) => <Icon name="search" {...props} />
export const CloseIcon = (props: Omit<IconProps, 'name'>) => <Icon name="close" {...props} />
export const EyeIcon = (props: Omit<IconProps, 'name'>) => <Icon name="eye" {...props} />
export const EyeOffIcon = (props: Omit<IconProps, 'name'>) => <Icon name="eye-off" {...props} />
export const SettingsIcon = (props: Omit<IconProps, 'name'>) => <Icon name="settings" {...props} />
export const TransitIcon = (props: Omit<IconProps, 'name'>) => <Icon name="transit" {...props} />
export const OrderIcon = (props: Omit<IconProps, 'name'>) => <Icon name="order" {...props} />
export default Icon



