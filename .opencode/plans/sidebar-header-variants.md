# Sidebar Header — 3 варианта

## Общие изменения (все варианты)

1. Кнопка «Новая фича» (без «+») — перенесена над поиском, full-width
2. Логотип из `public/qa-icon.svg` используется как `<img src="/qa-icon.svg">`

---

## Вариант A — Minimalist (как TestCasesProject)

Компактный, чистый, в стиле TestCasesProject.

```
┌──────────────────────────────┐
│  [🛡️]  QA Platform           │  ← header: logo 28px + текст, left-align
│                              │
│  ┌────────────────────────┐  │
│  │   Новая фича           │  │  ← button: full-width, blue accent
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Текущая модель          │  │  ← runtime-box
│  │ default                 │  │
│  │ Custom LLM              │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 🔍 Поиск фичи          │  │  ← search
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Feature Title           │  │  ← feature-item cards
│  │ slug · 12 кейсов · 3 req│  │
│  └────────────────────────┘  │
│          ...                 │
└──────────────────────────────┘
```

**Header CSS:**
```css
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 14px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sidebar-brand img {
  width: 28px;
  height: 28px;
}
.sidebar-brand__text {
  font-size: 15px;
  font-weight: 700;
  color: #edf3ff;
  letter-spacing: -0.01em;
}
```

**Плюсы:** Знакомый стиль, компактный, не отвлекает.
**Минусы:** Минимальный brand-присутствие.

---

## Вариант B — Bold / Centered

Центрированный логотип, более заметный brand.

```
┌──────────────────────────────┐
│                              │
│        [🛡️ 48px]            │  ← centered logo, крупный
│      QA Platform             │  ← centered text, 16px bold
│                              │
│  ─────────────────────────── │  ← divider
│                              │
│  ┌────────────────────────┐  │
│  │   Новая фича           │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🔍 Поиск фичи          │  │
│  └────────────────────────┘  │
│          ...                 │
└──────────────────────────────┘
```

**Header CSS:**
```css
.sidebar-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sidebar-brand img {
  width: 48px;
  height: 48px;
}
.sidebar-brand__text {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #edf3ff;
  letter-spacing: 0.02em;
}
```

**Плюсы:** Красивый, заметный brand, выглядит «как продукт».
**Минусы:** Занимает больше вертикального пространства.

---

## Вариант C — Modern / Inline Compact

Современный, логотип + текст inline, с version badge.

```
┌──────────────────────────────┐
│  [🛡️]  QA Platform  beta    │  ← logo 24px + text + badge
│                              │
│  ┌────────────────────────┐  │
│  │   Новая фича           │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Текущая модель          │  │
│  │ default / Custom LLM    │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🔍 Поиск фичи          │  │
│  └────────────────────────┘  │
│          ...                 │
└──────────────────────────────┘
```

**Header CSS:**
```css
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
}
.sidebar-brand img {
  width: 24px;
  height: 24px;
}
.sidebar-brand__text {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #edf3ff;
}
.sidebar-brand__badge {
  font-size: 10px;
  font-weight: 600;
  color: #9fb0c7;
  background: rgba(255,255,255,0.08);
  padding: 2px 8px;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
```

**Плюсы:** Компактный, современный, есть место для version/status badge.
**Минусы:** Badge может быть не нужен сейчас.

---

## Рекомендация

**Вариант A** — лучший старт. Ближе к TestCasesProject, компактный, легко апгрейдить до B/C.
