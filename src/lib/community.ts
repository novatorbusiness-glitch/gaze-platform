/**
 * GAZE Platform — T20: СООБЩЕСТВО МАСТЕРОВ
 *
 * Лента инсайтов/успехов, личные профили-блоги (аватар, ниша, посты),
 * подписки друг на друга, челленджи. Всё в localStorage (демо-режим):
 *   gaze_follows    = { masterId: true }        — подписки
 *   gaze_challenges = { challengeId: true }     — участие в челлендже
 *   gaze_posts      = [CommunityPost]           — посты мастера
 *   gaze_likes      = { postId: true }          — лайки
 */

export interface CommunityMaster {
  id: string
  name: string
  niche: string
  bio: string
  /** Цвет аватара / эмодзи */
  emoji: string
  /** Ключевая цифра для карточки («+12 клиентов») */
  stat: string
}

export interface CommunityPost {
  id: string
  masterId: string
  text: string
  /** Цифра/результат, например «Доход 120 000 ₽» */
  highlight?: string
  /** Дата (YYYY-MM-DD), сортировка свежих сверху */
  date: string
  /** Базовые лайки (демо) */
  likes: number
}

export interface Challenge {
  id: string
  title: string
  desc: string
  days: number
  participants: number
  emoji: string
}

const FOLLOWS_KEY = 'gaze_follows'
const CHALLENGES_KEY = 'gaze_challenges'
const POSTS_KEY = 'gaze_posts'
const LIKES_KEY = 'gaze_likes'

/* ------------------------------------------------------------------ */
/* Демо-мастера                                                        */
/* ------------------------------------------------------------------ */

export const DEMO_MASTERS: CommunityMaster[] = [
  { id: 'm1', name: 'Марина', niche: 'Маникюр', emoji: '💅', bio: 'Мастер ногтевого сервиса, 6 лет. Люблю чистые линии и уверенный рост.', stat: '+12 клиентов' },
  { id: 'm2', name: 'Настя', niche: 'Брови и ресницы', emoji: '👁️', bio: 'Бровист. Вернула базу и вышла на 100к за месяц.', stat: '100 000 ₽' },
  { id: 'm3', name: 'Ольга', niche: 'Парикмахер', emoji: '✂️', bio: 'Стрижки, окрашивание. Работаю в салоне, мой % — 60.', stat: '60% от чека' },
  { id: 'm4', name: 'Ксюша', niche: 'Массаж', emoji: '💆', bio: 'Классический и спортивный массаж. Онлайн-запись и напоминания.', stat: '95% повторных' },
  { id: 'm5', name: 'Диана', niche: 'Косметолог', emoji: '✨', bio: 'Чистки, уходы. Учу коллег считать юнит-экономику.', stat: 'маржа 71%' },
  { id: 'm6', name: 'Света', niche: 'Ресницы', emoji: '🌱', bio: 'Наращивание. Веду базу в GAZE и возвращаю клиентов через напоминания.', stat: '+8 возвратов' },
  { id: 'm7', name: 'Катя', niche: 'Шугаринг', emoji: '🍯', bio: 'Сахарная эпиляция. Пробую челлендж «30 дней возврата».', stat: 'день 12/30' },
  { id: 'm8', name: 'Лена', niche: 'Маникюр + педикюр', emoji: '🦶', bio: 'Комплексные визиты. Салон не скрывает контакты — работаю с базой сама.', stat: 'ср. чек 3 200 ₽' },
]

/* ------------------------------------------------------------------ */
/* Демо-посты                                                          */
/* ------------------------------------------------------------------ */

const d = (day: number) => {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(Math.min(Math.max(day, 1), 28)).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${dd}`
}

export const DEMO_POSTS: CommunityPost[] = [
  { id: 'p1', masterId: 'm1', text: 'Вернула 5 клиентов за неделю — просто напомнила о записи через GAZE 💪', highlight: '+5 клиентов', date: d(26), likes: 34 },
  { id: 'p2', masterId: 'm2', text: 'Вышла на 100к за месяц. Ключ — не скидки, а регулярные касания и аккуратная база.', highlight: '100 000 ₽', date: d(25), likes: 51 },
  { id: 'p3', masterId: 'm3', text: 'Салон даёт мне 60% — теперь вижу реальный доход, а не весь чек. Спасибо за режим салона!', highlight: '60% от чека', date: d(24), likes: 29 },
  { id: 'p4', masterId: 'm4', text: 'Напоминание за день до визита сократило «не пришла» почти в 2 раза.', highlight: '−50% неявок', date: d(23), likes: 42 },
  { id: 'p5', masterId: 'm5', text: 'Посчитала юнит-экономику: материалы 800 ₽, чек 2 800 ₽ → маржа 71%. Теперь вижу, что реально окупается.', highlight: 'маржа 71%', date: d(21), likes: 27 },
  { id: 'p6', masterId: 'm6', text: 'Написала 10 «давно не были» — вернулись 8. Люди ждут повода, дайте им его ✨', highlight: '+8 возвратов', date: d(19), likes: 38 },
  { id: 'p7', masterId: 'm7', text: 'День 12 челленджа «30 дней возврата». Уже +4 записи от старых клиентов.', highlight: 'день 12/30', date: d(17), likes: 19 },
  { id: 'p8', masterId: 'm8', text: 'Средний чек вырос до 3 200 — продаю комплекс «маникюр + педикюр», а не одну услугу.', highlight: 'ср. чек 3 200 ₽', date: d(15), likes: 23 },
]

/* ------------------------------------------------------------------ */
/* Челленджи                                                           */
/* ------------------------------------------------------------------ */

export const DEMO_CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    title: '30 дней возврата клиентов',
    desc: 'Каждый день пиши 1 «забытому» клиенту. Цель — вернуть 10 клиентов за месяц.',
    days: 30,
    participants: 128,
    emoji: '🔄',
  },
  {
    id: 'c2',
    title: 'Неделя чаевых',
    desc: 'Показывай QR после каждого визита 7 дней подряд. Цель — 10+ чаевых за неделю.',
    days: 7,
    participants: 74,
    emoji: '💸',
  },
  {
    id: 'c3',
    title: '5 новых клиентов',
    desc: 'Запиши 5 новых лиц за месяц. Делитесь, что сработало в ленте.',
    days: 30,
    participants: 203,
    emoji: '🚀',
  },
]

/* ------------------------------------------------------------------ */
/* localStorage-хелперы                                                */
/* ------------------------------------------------------------------ */

function readObj<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

function writeObj<T>(key: string, v: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* ignore */
  }
}

/* Подписки */
export function getFollows(): Record<string, boolean> {
  return readObj<boolean>(FOLLOWS_KEY)
}
export function isFollowing(masterId: string): boolean {
  return Boolean(getFollows()[masterId])
}
export function toggleFollow(masterId: string): boolean {
  const f = getFollows()
  const next = !f[masterId]
  if (next) f[masterId] = true
  else delete f[masterId]
  writeObj(FOLLOWS_KEY, f)
  return next
}

/* Челленджи */
export function getJoinedChallenges(): Record<string, boolean> {
  return readObj<boolean>(CHALLENGES_KEY)
}
export function isJoined(challengeId: string): boolean {
  return Boolean(getJoinedChallenges()[challengeId])
}
export function joinChallenge(challengeId: string): void {
  const c = getJoinedChallenges()
  c[challengeId] = true
  writeObj(CHALLENGES_KEY, c)
}

/* Лайки */
export function getLikes(): Record<string, boolean> {
  return readObj<boolean>(LIKES_KEY)
}
export function isLiked(postId: string): boolean {
  return Boolean(getLikes()[postId])
}
export function toggleLike(postId: string): boolean {
  const l = getLikes()
  const next = !l[postId]
  if (next) l[postId] = true
  else delete l[postId]
  writeObj(LIKES_KEY, l)
  return next
}

/* Посты мастера */
function readPostsStore(): Record<string, CommunityPost[]> {
  return readObj<CommunityPost[]>(POSTS_KEY)
}
export function getUserPosts(): CommunityPost[] {
  return readPostsStore()['user'] ?? []
}
function setUserPosts(posts: CommunityPost[]): void {
  const all = readPostsStore()
  all['user'] = posts
  writeObj(POSTS_KEY, all)
}
export function addUserPost(text: string, highlight?: string): CommunityPost[] {
  const now = new Date()
  const d0 = now.toISOString().slice(0, 10)
  const post: CommunityPost = {
    id: `user-${Date.now().toString(36)}`,
    masterId: 'me',
    text,
    highlight,
    date: d0,
    likes: 0,
  }
  const next = [post, ...getUserPosts()]
  setUserPosts(next)
  return next
}

/** Все посты: демо + свои (свои сверху) */
export function getAllPosts(): CommunityPost[] {
  return [...getUserPosts(), ...DEMO_POSTS]
}

export function getMasterById(id: string): CommunityMaster | undefined {
  return DEMO_MASTERS.find((m) => m.id === id)
}

export function postsByMaster(masterId: string): CommunityPost[] {
  if (masterId === 'me') return getUserPosts()
  return DEMO_POSTS.filter((p) => p.masterId === masterId)
}
