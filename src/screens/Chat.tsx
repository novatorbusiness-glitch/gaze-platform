import { useEffect, useRef, useState } from 'react'
import { HelpCircle, Pin, Send } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import {
  demoCommunityMessages,
  demoFaqItems,
  demoMentorMessages,
  demoMentorName,
  demoMentorRole,
  type CommunityMessage,
  type FaqItem,
  type MentorMessage,
} from '../lib/dev-data'
import { haptic } from '../lib/telegram'
import { displaySpecialty } from '../lib/specialty'
import { cx } from '../lib/utils'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Chat.module.css'

type ChatTab = 'mentor' | 'community'

/** T5 — Умный наставник: подбор ответа из FAQ по совпадению ключевых слов */
function findFaqAnswer(text: string): string | null {
  const q = text.trim().toLowerCase()
  if (!q) return null
  // Простой матчинг: проверяем пересечение слов вопроса мастера с вопросом FAQ
  const words = q.split(/\s+/).filter((w) => w.length > 3)
  let best: { item: FaqItem; score: number } | null = null
  for (const item of demoFaqItems) {
    const fq = item.question.toLowerCase()
    let score = 0
    for (const w of words) {
      if (fq.includes(w)) score++
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { item, score }
    }
  }
  return best && best.score >= 1 ? best.item.answer : null
}

/** T5 — Аккордеон FAQ: один открытый элемент, + → × через rotate(45deg) */
function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    haptic('light')
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <div className={styles.faqSection}>
      <div className={styles.faqHead}>
        <HelpCircle size={15} strokeWidth={2} />
        <span>Частые вопросы</span>
      </div>
      <div className={styles.faqList}>
        {demoFaqItems.map((item) => {
          const open = openId === item.id
          return (
            <div
              key={item.id}
              className={cx(styles.faqItem, open && styles.faqItemOpen)}
            >
              <button
                className={styles.faqTrigger}
                onClick={() => toggle(item.id)}
                aria-expanded={open}
              >
                <span className={styles.faqQuestion}>{item.question}</span>
                <span className={cx(styles.faqIcon, open && styles.faqIconOpen)}>+</span>
              </button>
              <div
                className={styles.faqAnswer}
                style={{ maxHeight: open ? '300px' : '0' }}
              >
                <div className={styles.faqAnswerInner}>{item.answer}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Пузырь чата: свои — --app-cta с белым текстом, чужие — --app-surface (ТЗ, ЭКРАН 7) */
function Bubble({
  text,
  time,
  mine,
}: {
  text: string
  time: string
  mine: boolean
}) {
  return (
    <div className={cx(styles.bubbleRow, mine && styles.bubbleRowMine)}>
      <div className={cx(styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther)}>
        <span className={styles.bubbleText}>{text}</span>
        <span className={cx(styles.bubbleTime, mine && styles.bubbleTimeMine)}>{time}</span>
      </div>
    </div>
  )
}

/** Сообщение сообщества: аватар-инициалы, имя, специализация pill, текст, время */
function CommunityItem({ message }: { message: CommunityMessage }) {
  return (
    <div className={styles.communityItem}>
      <Avatar name={message.author} size="md" />
      <div className={styles.communityBody}>
        <div className={styles.communityHead}>
          <span className={styles.communityAuthor}>{message.author}</span>
          <Badge variant="accent">{message.specialty}</Badge>
        </div>
        <div className={styles.communityTextRow}>
          {message.pinned && <Pin size={13} strokeWidth={2} className={styles.pinIcon} />}
          <span className={styles.communityText}>{message.text}</span>
        </div>
        <span className={styles.communityTime}>{message.time}</span>
      </div>
    </div>
  )
}

/** Typing indicator — три пульсирующие точки (как в iMessage) */
function TypingIndicator() {
  return (
    <div className={styles.typing}>
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
    </div>
  )
}

export default function Chat() {
  const isDemo = useMasterStore((s) => s.isDemo)
  const master = useMasterStore((s) => s.master)

  const [tab, setTab] = useState<ChatTab>('mentor')
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>(demoMentorMessages)
  const [communityMessages, setCommunityMessages] =
    useState<CommunityMessage[]>(demoCommunityMessages)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)

  const endRef = useRef<HTMLDivElement | null>(null)
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Автоскролл к последнему сообщению
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mentorMessages, communityMessages, typing])

  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current)
    },
    [],
  )

  const firstName = master?.name?.split(' ')[0] ?? 'Анна'

  const send = () => {
    const text = draft.trim()
    if (!text) return
    haptic('light')

    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    if (tab === 'mentor') {
      setMentorMessages((prev) => [
        ...prev,
        { id: `me-${Date.now()}`, from: 'me', text, time },
      ])
      // Наставник «печатает» и отвечает
      setTyping(true)
      replyTimer.current = setTimeout(() => {
        setTyping(false)
        setMentorMessages((prev) => [
          ...prev,
          {
            id: `mentor-${Date.now()}`,
            from: 'mentor',
            text: 'Приняла! 💛 Загляну в твою аналитику и вернусь с подсказкой.',
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      }, 1400)
    } else {
      setCommunityMessages((prev) => [
        ...prev,
        {
          id: `me-c-${Date.now()}`,
          author: firstName,
          specialty: displaySpecialty('Специалист'),
          text,
          time,
        },
      ])
    }
    setDraft('')
  }

  const switchTab = (next: ChatTab) => {
    haptic('light')
    setTab(next)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Сообщения</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>

      {/* Табы: Наставник · Сообщество */}
      <div className={styles.tabs}>
        <button
          className={cx(styles.tab, tab === 'mentor' && styles.tabActive)}
          onClick={() => switchTab('mentor')}
        >
          Наставник
        </button>
        <button
          className={cx(styles.tab, tab === 'community' && styles.tabActive)}
          onClick={() => switchTab('community')}
        >
          Сообщество
        </button>
      </div>

      {/* ---- Таб: Наставник (личный чат 1-1) ---- */}
      {tab === 'mentor' && (
        <div className={styles.mentorWrap}>
          <div className={styles.mentorHeader}>
            <Avatar name={demoMentorName} size="md" />
            <div className={styles.mentorInfo}>
              <span className={styles.mentorName}>{demoMentorName}</span>
              <span className={styles.mentorRole}>{demoMentorRole}</span>
            </div>
          </div>

          <div className={styles.thread}>
            {mentorMessages.map((message) => (
              <Bubble
                key={message.id}
                text={message.text}
                time={message.time}
                mine={message.from === 'me'}
              />
            ))}
            {typing && (
              <div className={styles.bubbleRow}>
                <div className={cx(styles.bubble, styles.bubbleOther)}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      {/* ---- Таб: Сообщество (общий чат) ---- */}
      {tab === 'community' && (
        <div className={styles.communityList}>
          {communityMessages.length > 0 ? (
            communityMessages.map((message) => (
              <CommunityItem key={message.id} message={message} />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💬</span>
              <p className={styles.emptyTitle}>Здесь общаются мастера GAZE</p>
              <p className={styles.emptyText}>
                Задай вопрос, поделись кейсом или просто поздоровайся.
              </p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* Инпут внизу — sticky */}
      <div className={styles.inputBar}>
        <input
          className={styles.input}
          type="text"
          placeholder={tab === 'mentor' ? 'Написать наставнику...' : 'Написать в сообщество...'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
        />
        <button
          className={styles.sendBtn}
          aria-label="Отправить"
          disabled={!draft.trim()}
          onClick={send}
        >
          <Send size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
