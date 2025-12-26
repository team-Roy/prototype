import { cn } from '@/lib/utils';
import { Shield, Star, Crown } from 'lucide-react';

export type UserRole = 'USER' | 'CREATOR' | 'ADMIN';

interface RoleBadgeProps {
  role: UserRole | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const roleConfig = {
  ADMIN: {
    icon: Shield,
    label: '관리자',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/30',
  },
  CREATOR: {
    icon: Star,
    label: '크리에이터',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/30',
  },
  USER: {
    icon: null,
    label: '회원',
    bgColor: '',
    textColor: '',
    borderColor: '',
  },
};

const sizeConfig = {
  sm: {
    icon: 'w-3 h-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
    gap: 'gap-0.5',
  },
  md: {
    icon: 'w-4 h-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
    gap: 'gap-1',
  },
  lg: {
    icon: 'w-5 h-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
    gap: 'gap-1.5',
  },
};

export function RoleBadge({ role, size = 'sm', showLabel = false, className }: RoleBadgeProps) {
  const config = roleConfig[role as UserRole] || roleConfig.USER;
  const sizeStyles = sizeConfig[size];

  // 일반 사용자는 뱃지 표시 안함
  if (role === 'USER' || !config.icon) {
    return null;
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeStyles.padding,
        sizeStyles.gap,
        className
      )}
    >
      <Icon className={sizeStyles.icon} />
      {showLabel && <span className={sizeStyles.text}>{config.label}</span>}
    </span>
  );
}

// 이름과 함께 표시할 때 사용
interface UserNameWithRoleProps {
  nickname: string;
  role: UserRole | string;
  className?: string;
  showBadge?: boolean;
}

export function UserNameWithRole({
  nickname,
  role,
  className,
  showBadge = true,
}: UserNameWithRoleProps) {
  const config = roleConfig[role as UserRole] || roleConfig.USER;

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn('font-medium', config.textColor || 'text-foreground')}>{nickname}</span>
      {showBadge && <RoleBadge role={role} size="sm" />}
    </span>
  );
}

// 라운지 내 크리에이터 뱃지 (공식 크리에이터용)
interface LoungeCreatorBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function LoungeCreatorBadge({ size = 'sm', className }: LoungeCreatorBadgeProps) {
  const sizeStyles = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5',
        className
      )}
      title="공식 크리에이터"
    >
      <Crown className={cn(sizeStyles, 'text-white')} />
    </span>
  );
}
