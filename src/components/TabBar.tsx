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

  // На экранах профиля клиента, форм, академии (курс/урок), чаевых (QR/оплата),
  // премиума/AI-маркетолога (G2) и приглашения (T6) tab-bar скрыт — это оверлеи
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
    screen === 'path' ||
    screen === 'premium' ||
    screen === 'aiMarketer' ||
    screen === 'invite' ||
    // G3/G1c/обложки — оверлеи, открываемые из Академии/Профиля: таббар скрыт.
    // Раньше эти экраны пропускали в hide-списке (баг): таббар «застревал» снизу,
    // хотя App.tsx уже помечал их как app--no-tabbar (отступ 20px вместо 104px).
    screen === 'growth' ||
    screen === 'certificate' ||
    screen === 'coverMaker'
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
