import TabBar from './components/TabBar'
import { cx } from './lib/utils'
import { useAppStore } from './store/useAppStore'
import Analytics from './screens/Analytics'
import Clients from './screens/Clients'
import ClientProfile from './screens/ClientProfile'
import Dashboard from './screens/Dashboard'
import Knowledge from './screens/Knowledge'
import Profile from './screens/Profile'
import './App.css'

export default function App() {
  const screen = useAppStore((s) => s.screen)
  const direction = useAppStore((s) => s.direction)

  const isClientProfile = screen === 'clientProfile'

  return (
    <div className={cx('app', isClientProfile && 'app--no-tabbar')}>
      <main key={screen} className={direction === 'back' ? 'screen-back' : 'screen-forward'}>
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'clients' && <Clients />}
        {screen === 'clientProfile' && <ClientProfile />}
        {screen === 'analytics' && <Analytics />}
        {screen === 'knowledge' && <Knowledge />}
        {screen === 'profile' && <Profile />}
      </main>
      <TabBar />
    </div>
  )
}
