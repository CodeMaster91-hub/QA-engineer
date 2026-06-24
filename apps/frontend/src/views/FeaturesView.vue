<template>
  <div class="features">
    <div class="header">
      <h1>Features</h1>
      <button @click="showCreate = true" class="btn btn-primary">+ Новая фича</button>
    </div>
    
    <div v-if="loading" class="loading">Загрузка...</div>
    
    <div v-else-if="features.length === 0" class="empty">
      <p>Нет фич. Создайте первую!</p>
    </div>
    
    <div v-else class="feature-list">
      <div v-for="feature in features" :key="feature.id" class="feature-card">
        <div class="feature-header">
          <div class="header-left">
            <h3>{{ feature.title }}</h3>
            <span class="slug">{{ feature.slug }}</span>
          </div>
          <span :class="['pipeline-badge', pipelineStatus(feature.slug)]">
            <span v-if="pipelineStatus(feature.slug) === 'running'" class="badge-spinner"></span>
            {{ pipelineLabel(feature.slug) }}
          </span>
        </div>

        <div v-if="pipelineStatus(feature.slug) === 'running'" class="pipeline-mini">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: pipelineProgress(feature.slug) + '%' }"></div>
          </div>
          <span class="progress-text">{{ pipelineStageName(feature.slug) }}</span>
        </div>

        <div class="feature-actions">
          <router-link :to="`/features/${feature.slug}`" class="btn btn-small">
            {{ pipelineStatus(feature.slug) === 'running' ? 'Открыть' : 'Подробнее' }}
          </router-link>
        </div>
      </div>
    </div>
    
    <div v-if="showCreate" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>Новая фича</h2>
        
        <div class="modal-body">
        <div class="form-group">
          <label>Тип источника</label>
          <div class="source-type-tabs">
            <button 
              type="button"
              :class="['tab', { active: sourceType === 'text' }]"
              @click="sourceType = 'text'"
            >
              Текст
            </button>
            <button 
              type="button"
              :class="['tab', { active: sourceType === 'file' }]"
              @click="sourceType = 'file'"
            >
              Файл
            </button>
            <button 
              type="button"
              :class="['tab', { active: sourceType === 'url' }]"
              @click="sourceType = 'url'"
            >
              Ссылка
            </button>
          </div>
        </div>

        <div v-if="sourceType === 'text'" class="form-group source-content">
          <label>Требования</label>
          <textarea 
            v-model="sourceText" 
            rows="8" 
            placeholder="Вставьте текст требований..."
          ></textarea>
        </div>

        <div v-if="sourceType === 'file'" class="form-group source-content">
          <label>Загрузить файл</label>
          <div 
            class="file-drop-zone"
            :class="{ 'has-file': selectedFile }"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <input 
              ref="fileInput"
              type="file" 
              accept=".pdf,.docx,.xlsx,.csv,.txt,.md"
              style="display: none"
              @change="handleFileSelect"
            />
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
          <input 
            v-model="sourceUrl" 
            type="url" 
            placeholder="https://example.com/requirements"
            @blur="validateUrl"
          />
          <div v-if="urlValidation" :class="['url-status', urlValidation.ok ? 'valid' : 'invalid']">
            {{ urlValidation.ok ? '✓ URL доступен' : urlValidation.error }}
          </div>
        </div>

        <div v-if="preview" class="form-group">
          <label>Превью</label>
          <div class="preview-box">
            {{ preview }}
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        </div>

        <div class="modal-actions">
          <button type="button" @click="closeModal" class="btn">Отмена</button>
          <button 
            type="button" 
            @click="createFeature" 
            class="btn btn-primary"
            :disabled="!canSubmit || submitting"
          >
            {{ submitting ? 'Создание...' : 'Создать и запустить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '@/api/client'
import { PIPELINE_STAGE_ORDER } from '@/api/types'
import type { Pipeline } from '@/api/types'

const features = ref<any[]>([])
const loading = ref(true)
const showCreate = ref(false)
const submitting = ref(false)
const error = ref('')

const pipelineMap = ref<Record<string, Pipeline>>({})

// SSE с reconnection
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

  const conn: SseConn = {
    eventSource: null as any,
    retryTimeout: null,
    retryDelay: 1000,
    lastEventTimestamp: 0,
    disposed: false,
  }
  sseConnections.set(featureId, conn)

  const connect = () => {
    if (conn.disposed) return

    const sinceParam = conn.lastEventTimestamp > 0
      ? `?since=${conn.lastEventTimestamp}`
      : ''
    const url = `/api/events/stream/${featureId}${sinceParam}`
    const es = new EventSource(url)
    conn.eventSource = es

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)

        // Обновить timestamp для replay
        if (raw.id) {
          const ts = parseInt(raw.id.split('-')[0], 10)
          if (!isNaN(ts) && ts > conn.lastEventTimestamp) {
            conn.lastEventTimestamp = ts
          }
        }

        if (raw.type === 'pipeline:stage-update' || raw.type === 'pipeline:completed' || raw.type === 'pipeline:failed') {
          loadPipeline(slug)
        }

        conn.retryDelay = 1000
      } catch {}
    }

    es.onerror = () => {
      es.close()
      conn.eventSource = null
      scheduleReconnect(conn)
    }
  }

  const scheduleReconnect = (conn: SseConn) => {
    if (conn.disposed) return
    if (conn.retryTimeout) clearTimeout(conn.retryTimeout)

    conn.retryTimeout = setTimeout(() => {
      conn.retryDelay = Math.min(conn.retryDelay * 2, MAX_RETRY_DELAY)
      connect()
    }, conn.retryDelay)
  }

  connect()
}

const unsubscribeSSE = (featureId: string) => {
  const conn = sseConnections.get(featureId)
  if (conn) {
    conn.disposed = true
    if (conn.retryTimeout) clearTimeout(conn.retryTimeout)
    conn.eventSource?.close()
    sseConnections.delete(featureId)
  }
}

const sourceType = ref<'text' | 'file' | 'url'>('text')
const sourceText = ref('')
const selectedFile = ref<File | null>(null)
const sourceUrl = ref('')
const urlValidation = ref<{ ok: boolean; error?: string } | null>(null)
const preview = ref('')

const fileInput = ref<HTMLInputElement | null>(null)

const canSubmit = computed(() => {
  switch (sourceType.value) {
    case 'text':
      return sourceText.value.trim().length > 0
    case 'file':
      return selectedFile.value !== null
    case 'url':
      return sourceUrl.value.trim().length > 0 && urlValidation.value?.ok === true
    default:
      return false
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
  if (sourceType.value === 'text' && val) {
    preview.value = val.substring(0, 500)
  }
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

    if (p.status === 'running') {
      subscribeToSSE(p.featureId, slug)
    } else {
      unsubscribeSSE(p.featureId)
    }
  } catch {
    const feature = features.value.find(f => f.slug === slug)
    if (feature) {
      pipelineMap.value[slug] = {
        id: '',
        featureId: feature.id,
        status: 'idle',
        currentStage: 'new',
        stageResults: {},
        retryCount: 0,
        maxRetries: 3,
        questions: [],
        blockedStage: null,
        coverageGaps: null,
        createdAt: '',
        updatedAt: '',
      }
    }
  }
}

const loadPipelines = async () => {
  for (const feature of features.value) {
    await loadPipeline(feature.slug)
  }
}

const pipelineStatus = (slug: string) => {
  return pipelineMap.value[slug]?.status || 'idle'
}

const pipelineLabel = (slug: string) => {
  const status = pipelineStatus(slug)
  const map: Record<string, string> = {
    idle: 'New',
    running: 'Running',
    blocked: 'Нужен фидбек',
    waiting_for_qa: 'Ожидает одобрения QA',
    completed: 'Passed',
    failed: 'Failed',
    cancelled: 'Canceled',
    paused: 'Paused',
  }
  return map[status] || status
}

const pipelineProgress = (slug: string) => {
  const p = pipelineMap.value[slug]
  if (!p) return 0
  if (p.status === 'completed') return 100
  if (p.status === 'idle') return 0
  const idx = PIPELINE_STAGE_ORDER.indexOf(p.currentStage)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / PIPELINE_STAGE_ORDER.length) * 100)
}

const pipelineStageName = (slug: string) => {
  const p = pipelineMap.value[slug]
  if (!p) return ''
  const stage = p.currentStage
  const labels: Record<string, string> = {
    new: 'New',
    source_ingested: 'Source',
    requirements_extracted: 'Requirements',
    draft_created: 'Draft',
    coverage_audited: 'Coverage',
    review: 'Review',
    dry_run_completed: 'Dry Run',
    published: 'Published',
  }
  return labels[stage] || stage
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files?.length) {
    selectedFile.value = target.files[0]
  }
}

const handleDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files?.length) {
    selectedFile.value = files[0]
  }
}

const removeFile = () => {
  selectedFile.value = null
  preview.value = ''
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const validateUrl = async () => {
  if (!sourceUrl.value) {
    urlValidation.value = null
    return
  }

  try {
    new URL(sourceUrl.value)
  } catch {
    urlValidation.value = { ok: false, error: 'Некорректный URL' }
    return
  }

  urlValidation.value = { ok: true }
}

const createFeature = async () => {
  submitting.value = true
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('sourceType', sourceType.value)

    switch (sourceType.value) {
      case 'text':
        formData.append('sourceText', sourceText.value)
        break
      case 'file':
        if (selectedFile.value) {
          formData.append('file', selectedFile.value)
        }
        break
      case 'url':
        formData.append('sourceUrl', sourceUrl.value)
        break
    }

    resetForm()
    closeModal()

    const result = await api.postFormData<{ feature: any; preview: string }>('/features/create-with-source', formData)

    await loadFeatures()
    await loadPipelines()

    try {
      await api.post(`/pipeline/${result.feature.slug}/run`)
    } catch (e) {
      console.error('Failed to auto-start pipeline:', e)
    }

    await loadPipelines()
  } catch (e: any) {
    error.value = e.message || 'Failed to create feature'
    showCreate.value = true
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  sourceType.value = 'text'
  sourceText.value = ''
  selectedFile.value = null
  sourceUrl.value = ''
  urlValidation.value = null
  preview.value = ''
  error.value = ''
}

const closeModal = () => {
  showCreate.value = false
  resetForm()
}

// Fallback polling для running pipelines
let pollInterval: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  pollInterval = setInterval(async () => {
    for (const feature of features.value) {
      const status = pipelineMap.value[feature.slug]?.status
      if (status === 'running') {
        await loadPipeline(feature.slug)
      }
    }
  }, 10000)
}

onMounted(async () => {
  await loadFeatures()
  await loadPipelines()
  startPolling()
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  sseConnections.forEach((conn) => {
    conn.disposed = true
    if (conn.retryTimeout) clearTimeout(conn.retryTimeout)
    conn.eventSource?.close()
  })
  sseConnections.clear()
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  color: #1a1a2e;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: #666;
}

.feature-list {
  display: grid;
  gap: 16px;
}

.feature-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.header-left h3 {
  margin: 0 0 4px 0;
  color: #1a1a2e;
}

.pipeline-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pipeline-badge.idle { background: #f5f5f5; color: #666; }
.pipeline-badge.running { background: #e3f2fd; color: #1068bf; }
.pipeline-badge.blocked { background: #fef3c7; color: #d97706; }
.pipeline-badge.waiting_for_qa { background: #f5f3ff; color: #7c3aed; }
.pipeline-badge.completed { background: #e8f5e9; color: #2da160; }
.pipeline-badge.failed { background: #ffebee; color: #dd2b0e; }
.pipeline-badge.cancelled { background: #f5f5f5; color: #666; }
.pipeline-badge.paused { background: #fff3e0; color: #ef6c00; }

.badge-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid #1068bf;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pipeline-mini {
  margin-bottom: 12px;
}

.progress-bar {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: #1068bf;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8em;
  color: #1068bf;
}

.slug {
  color: #666;
  font-size: 0.85em;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  background: #e0e0e0;
  color: #333;
}

.btn-primary {
  background: #1a1a2e;
  color: white;
}

.btn-primary:disabled {
  background: #999;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.9em;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.form-group {
  margin-bottom: 16px;
}

.source-content {
  display: flex;
  flex-direction: column;
  height: 200px;
}

.source-content label {
  flex-shrink: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
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

.tab:hover {
  background: #f5f5f5;
}

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

.file-drop-zone:hover {
  border-color: #1a1a2e;
}

.file-drop-zone.has-file {
  border-color: #4caf50;
  background: #f1f8e9;
}

.file-placeholder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-icon {
  font-size: 24px;
}

.file-hint {
  font-size: 0.85em;
  color: #666;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-weight: 500;
}

.file-size {
  color: #666;
  font-size: 0.9em;
}

.file-remove {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}

.file-remove:hover {
  color: #c62828;
}

.url-status {
  margin-top: 6px;
  font-size: 0.9em;
}

.url-status.valid {
  color: #2e7d32;
}

.url-status.invalid {
  color: #c62828;
}

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
</style>
