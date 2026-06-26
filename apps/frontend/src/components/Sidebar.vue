<template>
  <div
    class="sidebar"
    :style="{ width: sidebarWidth + 'px' }"
    :class="{ collapsed: sidebarWidth <= 60 }"
    @mouseenter="onHoverExpand"
  >
    <button v-if="sidebarWidth > 60" class="collapse-btn" @click.stop="onCollapseClick" title="Свернуть">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path d="M10 4L6 8L10 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="resize-handle" @mousedown="startResize"></div>

    <div class="sidebar-brand">
      <img src="/qa-icon.svg" alt="QA Platform" class="sidebar-brand__logo" />
      <span class="sidebar-brand__text">QA Platform</span>
    </div>

    <div class="sidebar-section">
      <button class="btn-new" @click="showCreate = true">Новая фича</button>
    </div>

    <div class="runtime-box">
      <div class="runtime-box__label">Текущая модель</div>
      <div class="runtime-box__value">{{ currentModel || '...' }}</div>
      <div class="runtime-box__meta">{{ currentProvider }}</div>
    </div>

    <div class="sidebar__section">
      <input
        v-model="searchQuery"
        type="search"
        class="search"
        placeholder="Поиск фичи"
        @click.stop
      />
    </div>

    <div class="sidebar-list">
      <div v-if="loading" class="sidebar-loading">Загрузка...</div>

      <template v-if="!loading">
        <div v-for="feature in features" :key="feature.id" class="feature-slot">
          <div
            class="feature-mini"
            :class="{ 'is-active': selectedSlug === feature.slug }"
            @click="navigateTo(feature.slug)"
          >
            <div class="status-dot" :class="pipelineStatus(feature.slug)"></div>
            <div class="feature-mini__tooltip">{{ feature.title || feature.slug }}</div>
          </div>

          <div
            v-if="sidebarWidth > 60 && isFeatureVisible(feature)"
            class="feature-item"
            :class="{ 'is-active': selectedSlug === feature.slug }"
            @click="navigateTo(feature.slug)"
          >
            <div class="feature-item__title">{{ feature.title || feature.slug }}</div>
            <div class="feature-item__meta">
              <span>{{ feature.caseCount }} кейсов</span>
              <span>{{ feature.reqCount }} требований</span>
            </div>
          </div>
        </div>

        <div v-if="sidebarWidth > 60 && features.length === 0" class="sidebar-empty">
          Нет фич
        </div>
        <div v-if="sidebarWidth > 60 && searchQuery && filteredFeatures.length === 0" class="sidebar-empty">
          Ничего не найдено
        </div>
      </template>
    </div>

    <div class="sidebar-footer" @click.stop>
      <div
        class="settings-item"
        :class="{ 'is-selected': showSettings }"
        @click="showSettings = !showSettings"
      >
        <div class="settings-icon">⚙️</div>
        <span class="settings-text">Настройки</span>
      </div>
    </div>

    <!-- Settings Overlay -->
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
      <div class="settings-panel">
        <SettingsView />
      </div>
    </div>

    <!-- Create Feature Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>Новая фича</h2>

        <div class="modal-body">
          <div class="form-group">
            <label>Тип источника</label>
            <div class="source-type-tabs">
              <button type="button" :class="['tab', { active: sourceType === 'text' }]" @click="sourceType = 'text'">Текст</button>
              <button type="button" :class="['tab', { active: sourceType === 'file' }]" @click="sourceType = 'file'">Файл</button>
              <button type="button" :class="['tab', { active: sourceType === 'url' }]" @click="sourceType = 'url'">Ссылка</button>
            </div>
          </div>

          <div v-if="sourceType === 'text'" class="form-group source-content">
            <label>Требования</label>
            <textarea v-model="sourceText" rows="8" placeholder="Вставьте текст требований..."></textarea>
          </div>

          <div v-if="sourceType === 'file'" class="form-group source-content">
            <label>Загрузить файл</label>
            <div class="file-drop-zone" :class="{ 'has-file': selectedFile }" @click="triggerFileInput" @dragover.prevent @drop.prevent="handleDrop">
              <input ref="fileInput" type="file" accept=".pdf,.docx,.xlsx,.csv,.txt,.md" style="display: none" @change="handleFileSelect" />
              <div v-if="!selectedFile" class="file-placeholder">
                <span class="file-icon">📁</span>
                <span>Перетащите файл или кликните</span>
                <span class="file-hint">PDF, DOCX, XLSX, CSV, TXT, MD (до 10MB)</span>
              </div>
              <div v-else class="file-info">
                <span class="file-name">{{ selectedFile.name }}</span>
                <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                <button type="button" class="file-remove" @click.stop="removeFile">✕</button>
              </div>
            </div>
          </div>

          <div v-if="sourceType === 'url'" class="form-group source-content">
            <label>URL</label>
            <input v-model="sourceUrl" type="url" placeholder="https://example.com/requirements" @blur="validateUrl" />
            <div v-if="urlValidation" :class="['url-status', urlValidation.ok ? 'valid' : 'invalid']">
              {{ urlValidation.ok ? '✓ URL доступен' : urlValidation.error }}
            </div>
          </div>

            <div v-if="error" class="error-message">{{ error }}</div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="closeModal" class="btn">Отмена</button>
          <button type="button" @click="createFeature" class="btn btn-primary" :disabled="!canSubmit || submitting">
            {{ submitting ? 'Создание...' : 'Создать и запустить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/api/client'
import { PIPELINE_STAGE_ORDER } from '@/api/types'
import type { Pipeline, Feature, LlmProvider } from '@/api/types'
import SettingsView from '@/views/SettingsView.vue'

const router = useRouter()
const route = useRoute()

const COLLAPSED_WIDTH = 60
const EXPANDED_WIDTH = 320
const sidebarWidth = ref(EXPANDED_WIDTH)
const isCollapsed = ref(false)
const isTransitioning = ref(false)
const isResizing = ref(false)
const features = ref<Feature[]>([])
const loading = ref(true)
const showCreate = ref(false)
const showSettings = ref(false)
const submitting = ref(false)
const error = ref('')
const searchQuery = ref('')
const currentModel = ref<string>('')
const currentProvider = ref<string>('')

const pipelineMap = ref<Record<string, Pipeline>>({})

const filteredFeatures = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return features.value
  return features.value.filter((f) =>
    f.title.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q),
  )
})

const isFeatureVisible = (feature: Feature) => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return true
  return feature.title.toLowerCase().includes(q) || feature.slug.toLowerCase().includes(q)
}

const loadModelInfo = async () => {
  try {
    const providers = await api.get<LlmProvider[]>('/agents/providers')
    if (providers?.length) {
      const p = providers[0]
      currentProvider.value = p.name
      currentModel.value = p.aliases[0] || p.name
    }
  } catch {
    currentModel.value = 'N/A'
  }
}

const selectedSlug = computed(() => {
  const slug = route.params.slug as string
  return slug || null
})

const sourceType = ref<'text' | 'file' | 'url'>('text')
const sourceText = ref('')
const selectedFile = ref<File | null>(null)
const sourceUrl = ref('')
const urlValidation = ref<{ ok: boolean; error?: string } | null>(null)
const preview = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const canSubmit = computed(() => {
  switch (sourceType.value) {
    case 'text': return sourceText.value.trim().length > 0
    case 'file': return selectedFile.value !== null
    case 'url': return sourceUrl.value.trim().length > 0 && urlValidation.value?.ok === true
    default: return false
  }
})

watch(sourceType, () => {
  sourceText.value = ''
  selectedFile.value = null
  sourceUrl.value = ''
  urlValidation.value = null
  preview.value = ''
  error.value = ''
})

watch(sourceText, (val) => {
  if (sourceType.value === 'text' && val) preview.value = val.substring(0, 500)
})

watch(selectedFile, (file) => {
  if (file && sourceType.value === 'file') {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      preview.value = text.substring(0, 500)
    }
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      preview.value = `[Файл: ${file.name}]`
    }
  }
})

const navigateTo = (slug: string) => {
  router.push(`/features/${slug}`)
}

const loadFeatures = async () => {
  try {
    const response = await api.get<{ data: any[]; total: number }>('/features')
    features.value = response.data || []
  } catch (e) {
    console.error('Failed to load features:', e)
  } finally {
    loading.value = false
  }
}

const loadPipeline = async (slug: string) => {
  try {
    const p = await api.get<Pipeline>(`/pipeline/${slug}/status`)
    pipelineMap.value[slug] = p
  } catch {
    const feature = features.value.find(f => f.slug === slug)
    if (feature) {
      pipelineMap.value[slug] = {
        id: '', featureId: feature.id, status: 'idle', currentStage: 'new',
        stageResults: {}, retryCount: 0, maxRetries: 3,
        questions: [], blockedStage: null, coverageGaps: null,
        createdAt: '', updatedAt: '',
      }
    }
  }
}

const loadPipelines = async () => {
  for (const feature of features.value) {
    await loadPipeline(feature.slug)
  }
}

const pipelineStatus = (slug: string) => pipelineMap.value[slug]?.status || 'idle'

const pipelineLabel = (slug: string) => {
  const status = pipelineStatus(slug)
  const map: Record<string, string> = {
    idle: 'New', running: 'Running', blocked: 'Нужен фидбек',
    waiting_for_qa: 'Ожидает QA', completed: 'Passed',
    failed: 'Failed', cancelled: 'Canceled', paused: 'Paused',
  }
  return map[status] || status
}

const triggerFileInput = () => fileInput.value?.click()

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files?.length) selectedFile.value = target.files[0]
}

const handleDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files?.length) selectedFile.value = files[0]
}

const removeFile = () => { selectedFile.value = null; preview.value = '' }

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const validateUrl = async () => {
  if (!sourceUrl.value) { urlValidation.value = null; return }
  try {
    new URL(sourceUrl.value)
    urlValidation.value = { ok: true }
  } catch {
    urlValidation.value = { ok: false, error: 'Некорректный URL' }
  }
}

const resetForm = () => {
  sourceType.value = 'text'; sourceText.value = ''; selectedFile.value = null
  sourceUrl.value = ''; urlValidation.value = null; preview.value = ''; error.value = ''
}

const closeModal = () => { showCreate.value = false; resetForm() }

const createFeature = async () => {
  submitting.value = true
  error.value = ''
  try {
    const formData = new FormData()
    formData.append('sourceType', sourceType.value)
    switch (sourceType.value) {
      case 'text': formData.append('sourceText', sourceText.value); break
      case 'file': if (selectedFile.value) formData.append('file', selectedFile.value); break
      case 'url': formData.append('sourceUrl', sourceUrl.value); break
    }
    resetForm()
    closeModal()
    const result = await api.postFormData<{ feature: any; preview: string }>('/features/create-with-source', formData)
    features.value.unshift(result.feature)
    await loadPipelines()
    try { await api.post(`/pipeline/${result.feature.slug}/run`) } catch {}
    navigateTo(result.feature.slug)
  } catch (e: any) {
    error.value = e.message || 'Failed to create feature'
    showCreate.value = true
  } finally {
    submitting.value = false
  }
}

// Collapse / Expand (hover-based)
const onCollapseClick = () => {
  isCollapsed.value = !isCollapsed.value
  sidebarWidth.value = isCollapsed.value ? COLLAPSED_WIDTH : EXPANDED_WIDTH
  isTransitioning.value = true
  setTimeout(() => { isTransitioning.value = false }, 250)
}

const onHoverExpand = () => {
  if (isCollapsed.value && !isResizing.value) {
    sidebarWidth.value = EXPANDED_WIDTH
    isTransitioning.value = true
    setTimeout(() => {
      const list = document.querySelector('.sidebar-list') as HTMLElement | null
      list?.scrollTo({ top: 0 })
      isTransitioning.value = false
    }, 300)
  }
}

// Resize
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  isTransitioning.value = false
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  e.preventDefault()
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const newWidth = Math.max(60, Math.min(500, e.clientX))
  sidebarWidth.value = newWidth
  if (newWidth > COLLAPSED_WIDTH) {
    isCollapsed.value = false
  }
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// SSE connections
interface SseConn {
  eventSource: EventSource | null
  retryTimeout: ReturnType<typeof setTimeout> | null
  retryDelay: number
  lastEventTimestamp: number
  disposed: boolean
}
const sseConnections = new Map<string, SseConn>()
const MAX_RETRY_DELAY = 30000

const subscribeToSSE = (featureId: string, slug: string) => {
  if (sseConnections.has(featureId)) return
  const conn: SseConn = { eventSource: null as any, retryTimeout: null, retryDelay: 1000, lastEventTimestamp: 0, disposed: false }
  sseConnections.set(featureId, conn)
  const connect = () => {
    if (conn.disposed) return
    const sinceParam = conn.lastEventTimestamp > 0 ? `?since=${conn.lastEventTimestamp}` : ''
    const es = new EventSource(`/api/events/stream/${featureId}${sinceParam}`)
    conn.eventSource = es
    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)
        if (raw.id) {
          const ts = parseInt(raw.id.split('-')[0], 10)
          if (!isNaN(ts) && ts > conn.lastEventTimestamp) conn.lastEventTimestamp = ts
        }
        if (raw.type === 'pipeline:stage-update' || raw.type === 'pipeline:completed' || raw.type === 'pipeline:failed') {
          loadPipeline(slug)
        }
        conn.retryDelay = 1000
      } catch {}
    }
    es.onerror = () => {
      es.close(); conn.eventSource = null
      const scheduleReconnect = () => {
        if (conn.disposed) return
        if (conn.retryTimeout) clearTimeout(conn.retryTimeout)
        conn.retryTimeout = setTimeout(() => {
          conn.retryDelay = Math.min(conn.retryDelay * 2, MAX_RETRY_DELAY)
          connect()
        }, conn.retryDelay)
      }
      scheduleReconnect()
    }
  }
  connect()
}

const unsubscribeAll = () => {
  sseConnections.forEach((conn) => {
    conn.disposed = true
    if (conn.retryTimeout) clearTimeout(conn.retryTimeout)
    conn.eventSource?.close()
  })
  sseConnections.clear()
}

// Polling
let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await Promise.all([loadFeatures(), loadModelInfo()])
  await loadPipelines()
  features.value.forEach(f => {
    const p = pipelineMap.value[f.slug]
    if (p?.status === 'running') subscribeToSSE(p.featureId, f.slug)
  })
  pollInterval = setInterval(async () => {
    for (const feature of features.value) {
      const status = pipelineMap.value[feature.slug]?.status
      if (status === 'running') await loadPipeline(feature.slug)
    }
  }, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  unsubscribeAll()
})
</script>

<style scoped>
/* === Sidebar === */
.sidebar {
  width: 320px;
  min-width: 0;
  height: 100vh;
  background: linear-gradient(180deg, #1f2a37 0%, #1b2430 100%);
  color: #edf3ff;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  transition: width 0.25s ease;
}

/* === Brand Header (Variant B — Bold / Centered) === */
.sidebar-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  transition: padding 0.25s ease, border-color 0.25s ease;
}

.sidebar.collapsed .sidebar-brand {
  padding: 18px 0 14px;
  border-bottom: none;
}

.sidebar-brand__logo {
  width: 48px;
  height: 48px;
  transition: width 0.25s ease, height 0.25s ease;
}

.sidebar.collapsed .sidebar-brand__logo {
  width: 32px;
  height: 32px;
}

.sidebar-brand__text {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #edf3ff;
  letter-spacing: 0.02em;
  transition: opacity 0.15s ease;
}

.sidebar.collapsed .sidebar-brand__text {
  display: none;
}

/* === New Feature Button === */
.sidebar-section {
  padding: 0 12px 12px;
  flex-shrink: 0;
  transition: padding 0.25s ease, opacity 0.15s ease;
}

.sidebar.collapsed .sidebar-section {
  display: none;
}

/* === Runtime / Model Box === */
.runtime-box {
  margin: 0 12px 14px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  flex-shrink: 0;
  transition: margin 0.25s ease, padding 0.25s ease, opacity 0.15s ease;
}

.sidebar.collapsed .runtime-box {
  display: none;
}

.runtime-box__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #9fb0c7;
  margin-bottom: 8px;
}

.runtime-box__value {
  font-size: 14px;
  font-weight: 700;
  color: #edf3ff;
}

.runtime-box__meta {
  margin-top: 4px;
  font-size: 12px;
  color: #9fb0c7;
}

/* === Section (search) === */
.sidebar__section {
  padding: 0 12px 12px;
  flex-shrink: 0;
  transition: padding 0.25s ease, opacity 0.15s ease;
}

.sidebar.collapsed .sidebar__section {
  display: none;
}

/* === Search === */
.search {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #edf3ff;
  border-radius: 12px;
  padding: 12px 14px;
  outline: none;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search::placeholder {
  color: rgba(237, 243, 255, 0.55);
}

.search:focus {
  border-color: rgba(91, 131, 255, 0.8);
  box-shadow: 0 0 0 3px rgba(91, 131, 255, 0.18);
}

/* === Feature List === */
.sidebar-list {
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 12px 12px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  transition: padding 0.25s ease;
}

.sidebar.collapsed .sidebar-list {
  padding: 8px 0;
  align-items: center;
  gap: 10px;
}

.sidebar-list::-webkit-scrollbar {
  display: none;
}

/* === Feature Slot (overlapping mini + full) === */
.feature-slot {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.sidebar:not(.collapsed) .feature-slot {
  display: block;
  min-height: auto;
}

/* === Feature Item === */
.feature-item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px 14px 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.25s ease;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.sidebar:not(.collapsed) .feature-item {
  opacity: 1;
  pointer-events: auto;
  position: relative;
  width: 100%;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.feature-item.is-active {
  border-color: rgba(91, 131, 255, 0.75);
  background: rgba(91, 131, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(91, 131, 255, 0.22);
}

.feature-item__title {
  font-weight: 700;
  color: #edf3ff;
  line-height: 1.3;
}

.feature-item__meta {
  margin-top: 8px;
  font-size: 12px;
  color: #9fb0c7;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* === Feature Mini (collapsed) === */
.feature-mini {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: opacity 0.2s ease;
  opacity: 1;
}

.sidebar:not(.collapsed) .feature-mini {
  opacity: 0;
  pointer-events: none;
  position: absolute;
}

.feature-mini:hover {
  background: rgba(255, 255, 255, 0.08);
}

.feature-mini.is-active {
  background: rgba(91, 131, 255, 0.15);
}

.feature-mini .status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.feature-mini .status-dot.idle { background: #666; }
.feature-mini .status-dot.running { background: #4fc3f7; animation: pulse 1.5s infinite; }
.feature-mini .status-dot.blocked { background: #f59e0b; }
.feature-mini .status-dot.waiting_for_qa { background: #8b5cf6; }
.feature-mini .status-dot.completed { background: #2da160; }
.feature-mini .status-dot.failed { background: #dd2b0e; }
.feature-mini .status-dot.cancelled { background: #666; }
.feature-mini .status-dot.paused { background: #ef6c00; }

.feature-mini__tooltip {
  display: none;
  position: absolute;
  left: 52px;
  top: 50%;
  transform: translateY(-50%);
  background: #1f2a37;
  color: #edf3ff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
  pointer-events: none;
}

.feature-mini:hover .feature-mini__tooltip {
  display: block;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* === Loading / Empty === */
.sidebar-loading,
.sidebar-empty {
  text-align: center;
  padding: 20px;
  color: #9fb0c7;
  font-size: 13px;
}

/* === Collapse / Resize === */
.collapse-btn {
  position: absolute;
  right: -8px;
  bottom: 60px;
  z-index: 10;
  background: #243244;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ccc;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background 0.2s;
  width: 20px;
  height: 20px;
}

.collapse-btn:hover {
  color: white;
  background: #3a3a5e;
}

.resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(91, 131, 255, 0.3);
}

/* === New Button === */
.btn-new {
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: #2157d6;
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  width: 100%;
}

.btn-new:hover {
  background: #2f6bf2;
}

/* === Footer === */
.sidebar-footer {
  flex-shrink: 0;
  padding: 10px 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  transition: padding 0.25s ease, border-color 0.25s ease;
}

.sidebar.collapsed .sidebar-footer {
  padding: 10px 0;
  justify-content: center;
  border-top: none;
}

.settings-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}

.sidebar.collapsed .settings-item {
  justify-content: center;
  width: auto;
  padding: 8px;
}

.sidebar.collapsed .settings-text {
  display: none;
}

.settings-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.settings-icon {
  font-size: 1.2em;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.settings-text {
  font-size: 0.85em;
  font-weight: 500;
  color: #edf3ff;
}

/* === Settings Overlay === */
.settings-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.settings-panel {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* === Modal === */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 18px 40px rgba(26, 44, 66, 0.08);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 20px;
  color: #17212b;
  font-size: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #17212b;
}

.source-content {
  display: flex;
  flex-direction: column;
  height: 200px;
}

.source-content label {
  flex-shrink: 0;
}

.source-type-tabs {
  display: flex;
  gap: 8px;
}

.tab {
  flex: 1;
  padding: 10px;
  border: 1px solid #d5dde8;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.tab:hover { background: #f6f8fb; }

.tab.active {
  background: #2157d6;
  color: white;
  border-color: #2157d6;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #d5dde8;
  border-radius: 8px;
  font-size: 1em;
  box-sizing: border-box;
}

.source-content input {
  flex: 1;
  min-height: 0;
}

.form-group textarea {
  resize: none;
  font-family: inherit;
  flex: 1;
  min-height: 0;
}

.file-drop-zone {
  border: 2px dashed #d5dde8;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.file-drop-zone:hover { border-color: #2157d6; }
.file-drop-zone.has-file { border-color: #0d8a5f; background: rgba(13, 138, 95, 0.06); }

.file-placeholder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-icon { font-size: 24px; }
.file-hint { font-size: 0.85em; color: #5f6b7a; }

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name { font-weight: 500; }
.file-size { color: #5f6b7a; font-size: 0.9em; }

.file-remove {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #9fb0c7;
}

.file-remove:hover { color: #c43e31; }

.url-status { margin-top: 6px; font-size: 0.9em; }
.url-status.valid { color: #0d8a5f; }
.url-status.invalid { color: #c43e31; }

.error-message {
  background: rgba(196, 62, 49, 0.08);
  color: #c43e31;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d5dde8;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  background: white;
  color: #17212b;
  transition: all 0.2s;
}

.btn:hover { background: #f6f8fb; }

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary {
  background: #2157d6;
  color: white;
  border-color: #2157d6;
}

.btn-primary:hover {
  background: #2f6bf2;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
