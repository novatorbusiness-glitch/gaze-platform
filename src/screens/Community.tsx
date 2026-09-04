import { useState } from 'react'
import { Crown, Flame, Heart, PenLine } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  DEMO_CHALLENGES,
  getAllPosts,
  getMasterById,
  isFollowing,
  isJoined,
  isLiked,
  joinChallenge,
  toggleLike,
  type Challenge,
  type CommunityPost,
} from '../lib/community'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx, formatDate } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Community.module.css'

/* ------------------------------------------------------------------ */
/* T20 — Сообщество мастеров: лента + челленджи + профили               */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  onOpenProfile,
  isPremium,
}: {
  post: CommunityPost
  onOpenProfile: (masterId: string) => void
  isPremium: boolean
}) {
  const master = getMasterById(post.masterId)
  const [liked, setLiked] = useState(() => isLiked(post.id))
  const [likes, setLikes] = useState(post.likes + (isLiked(post.id) ? 1 : 0))

  const onLike = () => {
    haptic('light')
    const next = toggleLike(post.id)
    setLiked(next)
    setLikes((l) => l + (next ? 1 : -1))
  }

  const name = master?.name ?? (post.masterId === 'me' ? 'Мой блог' : 'Мастер')
  const niche = master?.niche ?? (post.masterId === 'me' ? 'Это ты' : '')

  return (
    <Card className={styles.postCard}>
      <button className={styles.postHead} onClick={() => onOpenProfile(post.masterId)}>
        <Avatar name={name} size="md" />
        <span className={styles.postMeta}>
          <span className={styles.postName}>
            {name}
            {post.masterId === 'me' && isPremium && (
              <Badge variant="cta" className={styles.postPremiumBadge}>
                <Crown size={10} strokeWidth={2.5} />
                PREMIUM
              </Badge>
            )}
          </span>
          <span className={styles.postNiche}>{niche} · {formatDate(post.date)}</span>
        </span>
      </button>

      <p className={styles.postText}>{post.text}</p>
      {post.highlight && <Badge variant="success">{post.highlight}</Badge>}

      <button className={cx(styles.likeBtn, liked && styles.likeActive)} onClick={onLike}>
        <Heart size={15} strokeWidth={liked ? 2 : 1.5} fill={liked ? 'currentColor' : 'none'} />
        <span>{likes}</span>
      </button>
    </Card>
  )
}

function ChallengeCard({ c }: { c: Challenge }) {
  const [joined, setJoined] = useState(() => isJoined(c.id))
  const onJoin = () => {
    hapticSuccess()
    joinChallenge(c.id)
    setJoined(true)
  }
  return (
    <Card className={styles.challengeCard}>
      <span className={styles.challengeEmoji}>{c.emoji}</span>
      <div className={styles.challengeBody}>
        <span className={styles.challengeTitle}>{c.title}</span>
        <span className={styles.challengeDesc}>{c.desc}</span>
        <span className={styles.challengeMeta}>
          {c.days} дней · {c.participants} участников
        </span>
      </div>
      <Button
        variant={joined ? 'ghost' : 'primary'}
        size="md"
        onClick={onJoin}
        disabled={joined}
      >
        {joined ? 'Участвую ✓' : 'Участвовать'}
      </Button>
    </Card>
  )
}

export default function Community() {
  const openCommunityProfile = useAppStore((s) => s.openCommunityProfile)
  // G2 — премиум-бейдж: у мастера с премиум-тарифом (пользователь = 'me')
  const plan = useAppStore((s) => s.plan)
  const isPremium = plan === 'premium'
  const posts = getAllPosts()

  // Подписанные мастеры — сверху в ленте
  const sorted = [...posts].sort((a, b) => {
    const aF = isFollowing(a.masterId) ? 1 : 0
    const bF = isFollowing(b.masterId) ? 1 : 0
    return bF - aF || b.date.localeCompare(a.date)
  })

  const openProfile = (masterId: string) => {
    haptic('light')
    openCommunityProfile(masterId)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Сообщество</h1>
        <div className={styles.badgeRow}>
          <Badge>GAZE</Badge>
          <Badge variant="accent">мастера</Badge>
          {isPremium && (
            <Badge variant="cta">
              <Crown size={11} strokeWidth={2.5} />
              PREMIUM
            </Badge>
          )}
        </div>
      </header>

      <Card className={styles.hintCard}>
        <p className={styles.hintText}>
          Инсайты, успехи и поддержка мастеров GAZE. Делитесь результатами —
          и берите идеи, которые уже работают. ✨
        </p>
      </Card>

      {/* Лента — личный блог («Мой блог») и посты мастеров НАВЕРХУ, до челленджей */}
      <div className={styles.feedRow}>
        <h2 className={styles.sectionTitle}>Лента</h2>
        <button className={styles.myBlogBtn} onClick={() => openProfile('me')}>
          <PenLine size={14} /> Мой блог
        </button>
      </div>
      <div className={styles.feed}>
        {sorted.map((p) => (
          <PostCard key={p.id} post={p} onOpenProfile={openProfile} isPremium={isPremium} />
        ))}
      </div>

      {/* Челленджи */}
      <h2 className={styles.sectionTitle}>
        <Flame size={15} /> Челленджи
      </h2>
      <div className={styles.challengeList}>
        {DEMO_CHALLENGES.map((c) => (
          <ChallengeCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}
