import { useEffect } from 'react'
import TabBar from './components/TabBar'
import { cx } from './lib/utils'
import { useAppStore } from './store/useAppStore'
import { useMasterStore } from './store/useMasterStore'
import AddClient from './screens/AddClient'
import AddProcedure from './screens/AddProcedure'
import AiMarketer from './screens/AiMarketer'
import Analytics from './screens/Analytics'
import Bonuses from './screens/Bonuses'
import Certificate from './screens/Certificate'
import Chat from './screens/Chat'
import Clients from './screens/Clients'
import ClientProfile from './screens/ClientProfile'
import Community from './screens/Community'
import CommunityProfile from './screens/CommunityProfile'
import Course from './screens/Course'
import CoverMaker from './screens/CoverMaker'
import Dashboard from './screens/Dashboard'
import Expenses from './screens/Expenses'
import Growth from './screens/Growth'
import Invite from './screens/Invite'
import Knowledge from './screens/Knowledge'
import Lesson from './screens/Lesson'
import Path from './screens/Path'
import Premium from './screens/Premium'
import Profile from './screens/Profile'
import Tips from './screens/Tips'
import TipsPay from './screens/TipsPay'
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
  const isAddClient = screen === 'addClient'
  const isCourse = screen === 'course'
  const isLesson = screen === 'lesson'
  // T16 — экраны чаевых (QR и оплата) открываются поверх, без таббара
  const isTips = screen === 'tips' || screen === 'tipsPay'
  // T17 — экран «Расходы» открывается поверх (из аналитики), без таббара
  const isExpenses = screen === 'expenses'
  // T20 — профиль мастера в сообществе открывается поверх, без таббара
  const isCommunityProfile = screen === 'communityProfile'
  // G2 — Премиум и AI-маркетолог открываются поверх, без таббара
  const isPremiumScreens = screen === 'premium' || screen === 'aiMarketer'
  // G1b — «Путь роста» открывается поверх (из Академии или с дашборда), без таббара
  const isPath = screen === 'path'
  // G3 — «3 рычага роста» открывается поверх (из Академии), без таббара
  const isGrowth = screen === 'growth'
  // G1c — «Сертификат» открывается поверх (из «Пути роста»), без таббара
  const isCertificate = screen === 'certificate'
  // T6 — «Пригласить друга» открывается поверх (из профиля), без таббара
  const isInvite = screen === 'invite'
  // Генератор обложек открывается поверх (из профиля), без таббара
  const isCoverMaker = screen === 'coverMaker'
  const hideTabbar =
    isClientProfile || isAddProcedure || isAddClient || isCourse || isLesson || isTips || isExpenses || isCommunityProfile || isPremiumScreens || isPath || isGrowth || isCertificate || isInvite || isCoverMaker

  return (
    <div className={cx('app', hideTabbar && 'app--no-tabbar')}>
      <main key={screen} className={direction === 'back' ? 'screen-back' : 'screen-forward'}>
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'clients' && <Clients />}
        {screen === 'clientProfile' && <ClientProfile />}
        {screen === 'addProcedure' && <AddProcedure />}
        {screen === 'addClient' && <AddClient />}
        {screen === 'analytics' && <Analytics />}
        {screen === 'knowledge' && <Knowledge />}
        {screen === 'course' && <Course />}
        {screen === 'lesson' && <Lesson />}
        {screen === 'bonuses' && <Bonuses />}
        {screen === 'chat' && <Chat />}
        {screen === 'profile' && <Profile />}
        {screen === 'tips' && <Tips />}
        {screen === 'tipsPay' && <TipsPay />}
        {screen === 'expenses' && <Expenses />}
        {screen === 'invite' && <Invite />}
        {screen === 'community' && <Community />}
        {screen === 'communityProfile' && <CommunityProfile />}
        {screen === 'premium' && <Premium />}
        {screen === 'aiMarketer' && <AiMarketer />}
        {screen === 'path' && <Path />}
        {screen === 'coverMaker' && <CoverMaker />}
        {screen === 'growth' && <Growth />}
        {screen === 'certificate' && <Certificate />}
      </main>
      <TabBar />
    </div>
  )
}
