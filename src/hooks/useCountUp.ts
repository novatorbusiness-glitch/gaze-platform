import { useEffect, useRef, useState } from 'react'

/** CountUp-анимация цифр (ТЗ: при первом входе за день, 0.9s, ease-out cubic).
 *  Страховка: если rAF заморожен (фоновая вкладка / headless), setTimeout
 *  гарантированно доставляет финальное значение в конце анимации. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      }
    }
    frame.current = requestAnimationFrame(tick)
    // Страховка от заморозки rAF (фоновая вкладка, headless-браузер)
    timer.current = setTimeout(() => setValue(target), duration + 80)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      if (timer.current !== null) clearTimeout(timer.current)
    }
  }, [target, duration])

  return value
}
