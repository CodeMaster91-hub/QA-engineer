<template>
  <div
    class="sidebar"
    :style="{ width: sidebarWidth + 'px' }"
    :class="{ transitioning: isTransitioning }"
    @click="onSidebarClick"
  >
    <button class="collapse-btn" @click.stop="onCollapseClick" :title="sidebarWidth <= 60 ? 'Развернуть' : 'Свернуть'">
      <svg v-if="sidebarWidth > 60" viewBox="0 0 16 16" width="16" height="16">
        <path d="M10 4L6 8L10 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <svg v-else viewBox="0 0 16 16" width="16" height="16">
        <path d="M6 4L10 8L6 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="resize-handle" @mousedown="startResize"></div>

    <div class="sidebar-header" @click.stop>
      <button v-if="sidebarWidth > 60" class="btn-new" @click="showCreate = true">+ Новая фича</button>
    </div>

    <div class="sidebar-list" @click.stop>
      <div v-if="loading" class="sidebar-loading">Загрузка...</div>

      <template v-else>
        <div
          v-for="feature in features"
          :key="feature.id"
          class="sidebar-item"
          :class="{ selected: selectedSlug === feature.slug }"
          @click="navigateTo(feature.slug)"
        >
          <div class="status-dot" :class="pipelineStatus(feature.slug)"></div>

          <template v-if="sidebarWidth > 60">
            <div class="item-info">
              <div class="item-title">{{ feature.title || feature.slug }}</div>
              <div class="item-status">{{ pipelineLabel(feature.slug) }}</div>
            </div>
          </template>

          <template v-else>
            <div class="tooltip">{{ feature.title || feature.slug }}</div>
          </template>
        </div>
      </template>

      <div v-if="!loading && features.length === 0" class="sidebar-empty">
        Нет фич
      </div>
    </div>

    <div class="sidebar-footer" @click.stop>
      <div
        class="sidebar-item settings-item"
        :class="{ selected: showSettings }"
        @click="showSettings = !showSettings"
      >
        <div class="settings-icon">⚙️</div>
        <template v-if="sidebarWidth > 60">
          <div class="item-info">
            <div class="item-title">Настройки</div>
          </div>
        </template>
        <template v-else>
          <div class="tooltip">Настройки</div>
        </template>
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

          <div v-if="preview" class="form-group">
            <label>Превью</label>
            <div class="preview-box">{{ preview }}</div>
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
import type { Pipeline } from '@/api/types'
import SettingsView from '@/views/SettingsView.vue'

const router = useRouter()
const route = useRoute()

const sidebarWidth = ref(270)
const previousWidth = ref(270)
const isTransitioning = ref(false)
const isResizing = ref(false)
const features = ref<any[]>([])
const loading = ref(true)
const showCreate = ref(false)
const showSettings = ref(false)
const submitting = ref(false)
const error = ref('')

const pipelineMap = ref<Record<string, Pipeline>>({})

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

// Collapse / Expand
const onCollapseClick = () => {
  if (sidebarWidth.value > 60) {
    previousWidth.value = sidebarWidth.value
    sidebarWidth.value = 60
  }
  isTransitioning.value = true
  setTimeout(() => { isTransitioning.value = false }, 200)
}

const onSidebarClick = () => {
  if (sidebarWidth.value <= 60) {
    sidebarWidth.value = previousWidth.value
    isTransitioning.value = true
    setTimeout(() => { isTransitioning.value = false }, 200)
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
  await loadFeatures()
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
.sidebar {
  width: 270px;
  min-width: 0;
  height: 100vh;
  background: #1a1a2e;
  color: #ccc;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.sidebar.transitioning {
  transition: width 0.2s ease;
}

.sidebar-header {
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid #2a2a4e;
}

.collapse-btn {
  position: absolute;
  right: -8px;
  bottom: 60px;
  z-index: 10;
  background: #2a2a4e;
  border: 1px solid #3a3a5e;
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
  background: rgba(79, 195, 247, 0.3);
}

.btn-new {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #4fc3f7;
  color: #1a1a2e;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-new:hover {
  background: #29b6f6;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sidebar-list::-webkit-scrollbar {
  display: none;
}

.sidebar-loading,
.sidebar-empty {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 0.85em;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  margin-bottom: 2px;
}

.sidebar-item:hover {
  background: #2a2a4e;
}

.sidebar-item.selected {
  background: #1e3a5f;
  outline: 2px solid #4fc3f7;
  outline-offset: -2px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.idle { background: #666; }
.status-dot.running { background: #4fc3f7; animation: pulse 1.5s infinite; }
.status-dot.blocked { background: #f59e0b; }
.status-dot.waiting_for_qa { background: #8b5cf6; }
.status-dot.completed { background: #2da160; }
.status-dot.failed { background: #dd2b0e; }
.status-dot.cancelled { background: #666; }
.status-dot.paused { background: #ef6c00; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.85em;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  font-size: 0.7em;
  color: #888;
  margin-top: 2px;
}

.tooltip {
  display: none;
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background: #333;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  white-space: nowrap;
  z-index: 100;
  margin-left: 8px;
  pointer-events: none;
}

.sidebar-item:hover .tooltip {
  display: block;
}

.sidebar-footer {
  border-top: 1px solid #2a2a4e;
  padding: 8px;
}

.settings-icon {
  font-size: 1.2em;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

/* Settings Overlay */
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

/* Modal */
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
  border-radius: 8px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 20px;
  color: #1a1a2e;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover { background: #f5f5f5; }

.tab.active {
  background: #1a1a2e;
  color: white;
  border-color: #1a1a2e;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
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
  border: 2px dashed #ddd;
  border-radius: 8px;
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

.file-drop-zone:hover { border-color: #1a1a2e; }
.file-drop-zone.has-file { border-color: #4caf50; background: #f1f8e9; }

.file-placeholder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-icon { font-size: 24px; }
.file-hint { font-size: 0.85em; color: #666; }

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name { font-weight: 500; }
.file-size { color: #666; font-size: 0.9em; }

.file-remove {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}

.file-remove:hover { color: #c62828; }

.url-status { margin-top: 6px; font-size: 0.9em; }
.url-status.valid { color: #2e7d32; }
.url-status.invalid { color: #c62828; }

.preview-box {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
  font-size: 0.9em;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  background: white;
  color: #333;
  transition: all 0.2s;
}

.btn:hover { background: #f5f5f5; }

.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-primary {
  background: #1a1a2e;
  color: white;
  border-color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) { background: #0d0d1a; }
</style>
