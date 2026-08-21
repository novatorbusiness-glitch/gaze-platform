import { BarChart3, BookOpen, Home, User, Users, type LucideIcon } from 'lucide-react'
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
  { id: 'profile', label: 'Профиль', icon: User },
]

/** Tab-bar: fixed bottom, 5 вкладок, иконки + текст, active = --app-cta + точка (ТЗ, Часть 1) */
export default function TabBar() {
  const screen = useAppStore((s) => s.screen)
  const navigate = useAppStore((s) => s.navigate)

  // На экранах профиля клиента и записи процедуры tab-bar скрыт (там свои sticky-действия)
  if (screen === 'clientProfile' || screen === 'addProcedure') return null

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
