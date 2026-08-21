import { useEffect } from 'react'
import TabBar from './components/TabBar'
import { cx } from './lib/utils'
import { useAppStore } from './store/useAppStore'
import { useMasterStore } from './store/useMasterStore'
import AddProcedure from './screens/AddProcedure'
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
  const initMaster = useMasterStore((s) => s.init)

  // Определяем мастера по telegram_id (этап 2) при старте
  useEffect(() => {
    initMaster()
  }, [initMaster])

  const isClientProfile = screen === 'clientProfile'
  const isAddProcedure = screen === 'addProcedure'
  const hideTabbar = isClientProfile || isAddProcedure

  return (
    <div className={cx('app', hideTabbar && 'app--no-tabbar')}>
      <main key={screen} className={direction === 'back' ? 'screen-back' : 'screen-forward'}>
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'clients' && <Clients />}
        {screen === 'clientProfile' && <ClientProfile />}
        {screen === 'addProcedure' && <AddProcedure />}
        {screen === 'analytics' && <Analytics />}
        {screen === 'knowledge' && <Knowledge />}
        {screen === 'profile' && <Profile />}
      </main>
      <TabBar />
    </div>
  )
}
