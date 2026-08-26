import { useState } from 'react'
import { ArrowLeft, Check, Heart, PenLine } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input, Textarea } from '../components/Input'
import {
  addUserPost,
  getMasterById,
  getUserPosts,
  isFollowing,
  isLiked,
  postsByMaster,
  toggleFollow,
  toggleLike,
  type CommunityPost,
} from '../lib/community'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx, formatDate } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './CommunityProfile.module.css'

/* ------------------------------------------------------------------ */
/* T20 — Профиль мастера / «Мой блог» с формой поста                    */
/* ------------------------------------------------------------------ */

export default function CommunityProfile() {
  const masterId = useAppStore((s) => s.communityMasterId) ?? 'me'
  const goBack = useAppStore((s) => s.goBack)
  const displayName = useMasterStore((s) => s.master?.name ?? 'Мой блог')

  const isMe = masterId === 'me'
  const master = getMasterById(masterId)
  const name = isMe ? displayName : master?.name ?? 'Мастер'
  const niche = isMe ? 'Твой профиль' : master?.niche ?? ''
  const bio = isMe ? 'Это твой блог в сообществе GAZE. Делитесь успехами и инсайтами.' : master?.bio ?? ''

  const [following, setFollowing] = useState(() => (isMe ? false : isFollowing(masterId)))
  const [posts, setPosts] = useState<CommunityPost[]>(() => (isMe ? getUserPosts() : postsByMaster(masterId)))

  const [writeOpen, setWriteOpen] = useState(false)
  const [text, setText] = useState('')
  const [highlight, setHighlight] = useState('')

  const onFollow = () => {
    haptic('light')
    setFollowing(toggleFollow(masterId))
  }

  const onPublish = () => {
    if (!text.trim()) return
    hapticSuccess()
    setPosts(addUserPost(text.trim(), highlight.trim() || undefined))
    setText('')
    setHighlight('')
    setWriteOpen(false)
  }

  const PostRow = ({ p }: { p: CommunityPost }) => {
    const [liked, setLiked] = useState(() => isLiked(p.id))
    const [likes, setLikes] = useState(p.likes + (isLiked(p.id) ? 1 : 0))
    const onLike = () => {
      haptic('light')
      const next = toggleLike(p.id)
      setLiked(next)
      setLikes((l) => l + (next ? 1 : -1))
    }
    return (
      <Card className={styles.postCard}>
        <span className={styles.postDate}>{formatDate(p.date)}</span>
        <p className={styles.postText}>{p.text}</p>
        {p.highlight && <Badge variant="success">{p.highlight}</Badge>}
        <button className={cx(styles.likeBtn, liked && styles.likeActive)} onClick={onLike}>
          <Heart size={15} strokeWidth={liked ? 2 : 1.5} fill={liked ? 'currentColor' : 'none'} />
          <span>{likes}</span>
        </button>
      </Card>
    )
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => goBack()}>
          <ArrowLeft size={20} />
        </button>
        <span className={styles.title}>{isMe ? 'Мой блог' : 'Профиль'}</span>
        <span className={styles.headerSpacer} />
      </header>

      <Card className={styles.profileCard}>
        <div className={styles.profileHead}>
          <Avatar name={name} size="xl" />
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>{name}</h2>
            {niche && <Badge variant="accent">{niche}</Badge>}
          </div>
        </div>
        {bio && <p className={styles.profileBio}>{bio}</p>}
        {!isMe && (
          <Button
            variant={following ? 'ghost' : 'primary'}
            fullWidth
            onClick={onFollow}
          >
            {following ? 'Подписаться ✓' : 'Подписаться'}
          </Button>
        )}
        {isMe && (
          <Button variant="primary" fullWidth onClick={() => setWriteOpen(true)}>
            <PenLine size={16} /> Написать пост
          </Button>
        )}
      </Card>

      {/* Посты */}
      <h2 className={styles.sectionTitle}>{isMe ? 'Мои посты' : 'Посты мастера'}</h2>
      {posts.length === 0 ? (
        <Card className={styles.emptyCard}>
          <p className={styles.emptyText}>
            {isMe ? 'Пока нет постов. Поделитесь первым результатом!' : 'Мастер ещё не публиковал постов.'}
          </p>
        </Card>
      ) : (
        <div className={styles.posts}>
          {posts.map((p) => (
            <PostRow key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* Модалка: написать пост */}
      {writeOpen && (
        <div className={styles.overlay} onClick={() => setWriteOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.sheetTitle}>Новый пост</h3>
            <Textarea
              label="Текст поста"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Вернула 5 клиентов за неделю 💪"
              maxLength={400}
            />
            <Input
              label="Результат / цифра (необязательно)"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              placeholder="Например: +5 клиентов"
              maxLength={60}
            />
            <Button size="lg" fullWidth disabled={!text.trim()} onClick={onPublish}>
              <Check size={16} /> Опубликовать
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
