import { BarChart3, BookOpen, Home, User, Users, UsersRound, type LucideIcon } from 'lucide-react'
import { cx } from '../lib/utils'
import { haptic } from '../lib/telegram'
import { useAppStore, type Screen } from '../store/useAppStore'
import styles from './TabBar.module.css'

interface Tab {
  id: Screen
  label: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Главная', icon: Home },
  { id: 'clients', label: 'Клиенты', icon: Users },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'knowledge', label: 'Знания', icon: BookOpen },
  { id: 'community', label: 'Мастера', icon: UsersRound },
  { id: 'profile', label: 'Профиль', icon: User },
]

/** Tab-bar: fixed bottom, вкладки с иконками, активная = --app-cta + точка (ТЗ, Часть 1) */
export default function TabBar() {
  const screen = useAppStore((s) => s.screen)
  const navigate = useAppStore((s) => s.navigate)

  // На экранах профиля клиента, форм, академии (курс/урок) и чаевых (QR/оплата) tab-bar скрыт
  if (
    screen === 'clientProfile' ||
    screen === 'addProcedure' ||
    screen === 'addClient' ||
    screen === 'course' ||
    screen === 'lesson' ||
    screen === 'tips' ||
    screen === 'tipsPay' ||
    screen === 'expenses' ||
    screen === 'communityProfile' ||
    screen === 'path'
  )
    return null

  return (
    <nav className={styles.tabbar}>
      {TABS.map((tab) => {
        const active = screen === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            className={cx(styles.tab, active && styles.active)}
            onClick={() => {
              haptic('light')
              navigate(tab.id)
            }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.5}
              fill={active ? 'currentColor' : 'none'}
              className={styles.icon}
            />
            <span className={styles.label}>{tab.label}</span>
            <span className={cx(styles.dot, active && styles.dotVisible)} />
          </button>
        )
      })}
    </nav>
  )
}
