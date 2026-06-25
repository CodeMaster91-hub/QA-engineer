<template>
  <div class="feature-detail">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadAll" class="btn">Повторить</button>
    </div>

    <!-- Content -->
    <template v-else-if="feature">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-info">
          <h1>{{ feature.title }}</h1>
          <span class="slug">{{ feature.slug }}</span>
        </div>
        <div class="header-actions">
          <span :class="['pipeline-status-badge', pipeline?.status || 'idle']">
            {{ pipelineStatusText }}
          </span>
          <button
            v-if="pipeline?.status === 'blocked'"
            class="btn btn-continue"
            @click="onAnswerQuestions"
          >
            Продолжить
          </button>
          <button
            v-if="pipeline?.status === 'waiting_for_qa'"
            class="btn btn-approve"
            @click="onApprove"
          >
            Одобрить
          </button>
        </div>
      </div>

      <!-- Pipeline Bar -->
      <div class="pipeline-section" v-if="pipeline">
        <div class="pipeline-row">
          <div class="pipeline-bar-wrapper">
            <PipelineBar
              :stages="pipelineStages"
              :selectedStage="selectedStage || undefined"
              @select:stage="onStageSelect"
              @restart:stage="onRestartStage"
            />
          </div>

          <div class="pipeline-controls">
            <button
              v-if="canRun"
              @click="runPipeline"
              class="btn btn-primary"
              :disabled="submitting"
            >
              {{ submitting ? 'Запуск...' : '▶ Run Pipeline' }}
            </button>

            <button
              v-if="pipeline?.status === 'running'"
              @click="cancelPipeline"
              class="btn btn-danger"
            >
              ⏹ Cancel
            </button>

            <button
              v-if="pipeline?.status === 'completed' || pipeline?.status === 'failed'"
              @click="restartPipeline"
              class="btn"
            >
              ↻ Restart
            </button>
          </div>
        </div>

        <div class="pipeline-info">
          <span v-if="pipeline.error" class="pipeline-error">{{ pipeline.error }}</span>
          <span v-if="pipeline.status === 'running'" class="pipeline-progress">
            Stage {{ currentStageIndex + 1 }} of {{ totalStages }}
          </span>
        </div>
      </div>

      <!-- Stage Content -->
      <div class="stage-content" v-if="selectedStage">
        <!-- Processing indicator -->
        <div v-if="isStageProcessing(selectedStage) && !getArtifactForStage(selectedStage)" class="stage-processing">
          <p>Этап выполняется...</p>
        </div>
        <template v-else>
        <RequirementsStage
          v-if="selectedStage === 'requirements_extracted'"
          :source-artifact="getArtifact('source')"
          :artifact="getArtifact('requirements')"
          :questions="pipeline?.questions || []"
          @answer="onAnswerQuestions"
        />
        <TestPlanStage
          v-else-if="selectedStage === 'test_plan'"
          :artifact="getArtifact('testplan')"
        />
        <TestCasesStage
          v-else-if="selectedStage === 'test_cases'"
          :artifact="getArtifact('testcases')"
        />
        <CoverageStage
          v-else-if="selectedStage === 'coverage_audited'"
          :artifact="getArtifact('coverage')"
          :coverageGaps="pipeline?.coverageGaps"
          :filling="fillingGaps"
          @fill-gaps="onFillGaps"
        />
        <ReviewStage
          v-else-if="selectedStage === 'review'"
          :artifact="getArtifact('review')"
          :requirementsArtifact="getArtifact('requirements')"
          :testcasesArtifact="getArtifact('testcases')"
          :coverageArtifact="getArtifact('coverage')"
          :pipelineQuestions="pipeline?.questions"
        />
        <DryRunStage
          v-else-if="selectedStage === 'dry_run_completed'"
          :artifact="getArtifact('dry_run')"
        />
        <PublishedStage
          v-else-if="selectedStage === 'published'"
          :showPublish="pipeline?.status === 'completed'"
          @publish="showTestRailDialog = true"
        />
        </template>
      </div>

      <!-- Log Viewer -->
      <div class="logs-section" v-if="logEntries.length > 0">
        <h3>Logs</h3>
        <LogViewer :logs="logEntries" />
      </div>
    </template>

    <!-- TestRail Dialog -->
    <TestRailPublishDialog
      v-if="showTestRailDialog"
      :featureSlug="featureSlug"
      @close="showTestRailDialog = false"
      @published="onPublished"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import PipelineBar from '@/components/PipelineBar.vue'
import LogViewer from '@/components/LogViewer.vue'
import TestRailPublishDialog from '@/components/TestRailPublishDialog.vue'
import RequirementsStage from '@/components/stages/RequirementsStage.vue'
import TestPlanStage from '@/components/stages/TestPlanStage.vue'
import TestCasesStage from '@/components/stages/TestCasesStage.vue'
import CoverageStage from '@/components/stages/CoverageStage.vue'
import ReviewStage from '@/components/stages/ReviewStage.vue'
import DryRunStage from '@/components/stages/DryRunStage.vue'
import PublishedStage from '@/components/stages/PublishedStage.vue'
import type { Pipeline, Feature, Artifact, ArtifactType } from '@/api/types'
import { PIPELINE_STAGES_UI } from '@/api/types'

const route = useRoute()
const featureSlug = computed(() => route.params.slug as string)

const feature = ref<Feature | null>(null)
const pipeline = ref<Pipeline | null>(null)
const artifacts = ref<Artifact[]>([])
const loading = ref(true)
const error = ref('')
const submitting = ref(false)
const showTestRailDialog = ref(false)
const selectedStage = ref<string | null>(null)
const fillingGaps = ref(false)

const logEntries = ref<Array<{ level: 'info' | 'warn' | 'error'; message: string }>>([])

const pipelineStages = computed(() => {
  if (!pipeline.value) return []

  return PIPELINE_STAGES_UI.map((stageUI) => {
    const backendStage = stageUI.backendStage
    const result = backendStage ? pipeline.value!.stageResults?.[backendStage] : null
    let status: 'queued' | 'running' | 'success' | 'failed' | 'canceled' | 'blocked' | 'paused' = 'queued'

    if (result) {
      if (result.status === 'completed' || result.status === 'waiting_for_qa') {
        if (pipeline.value!.status === 'waiting_for_qa' && pipeline.value!.blockedStage === backendStage) {
          status = 'paused'
        } else {
          status = 'success'
        }
      } else if (result.status === 'failed') {
        status = 'failed'
      } else if (result.status === 'blocked') {
        status = 'paused'
      } else {
        status = 'running'
      }
    } else if (stageUI.key === 'requirements_extracted' && pipeline.value!.currentStage === 'source_ingested') {
      if (pipeline.value!.status === 'running') {
        status = 'running'
      }
    } else if (backendStage && pipeline.value!.currentStage === backendStage) {
      if (pipeline.value!.status === 'running') {
        status = 'running'
      } else if (pipeline.value!.status === 'blocked' && pipeline.value!.blockedStage === backendStage) {
        status = 'paused'
      } else if (pipeline.value!.status === 'waiting_for_qa' && pipeline.value!.blockedStage === backendStage) {
        status = 'paused'
      }
    }

    // If pipeline itself is failed, show failed status for all processed stages
    if (pipeline.value!.status === 'failed' && result) {
      status = 'failed'
    }

    // Override: fill-gaps in progress
    if (fillingGaps.value) {
      if (stageUI.key === 'test_cases') {
        status = 'running'
      }
      if (stageUI.key === 'coverage_audited') {
        status = 'queued'
      }
    }

    return { key: stageUI.key, label: stageUI.label, status }
  })
})

const currentStageIndex = computed(() => {
  if (!pipeline.value) return 0
  const idx = PIPELINE_STAGES_UI.findIndex(s => s.backendStage === pipeline.value!.currentStage)
  return idx >= 0 ? idx : 0
})

const totalStages = computed(() => PIPELINE_STAGES_UI.length)

const canRun = computed(() => {
  if (!pipeline.value) return true
  return pipeline.value.status === 'idle' || pipeline.value.status === 'failed' || pipeline.value.status === 'cancelled'
})

const pipelineStatusText = computed(() => {
  if (!pipeline.value) return 'idle'
  const status = pipeline.value.status
  const map: Record<string, string> = {
    idle: 'Pending',
    running: 'Running',
    blocked: 'Нужен фидбек',
    waiting_for_qa: 'Ожидает одобрения QA',
    paused: 'Paused',
    completed: 'Passed',
    failed: 'Failed',
    cancelled: 'Canceled',
  }
  return map[status] || status
})

const getArtifact = (type: ArtifactType): Artifact | null => {
  return artifacts.value.find(a => a.type === type) || null
}

const stageArtifactMap: Record<string, ArtifactType> = {
  source_ingested: 'source',
  requirements_extracted: 'requirements',
  test_plan: 'testplan',
  test_cases: 'testcases',
  coverage_audited: 'coverage',
  review: 'review',
  dry_run_completed: 'dry_run',
  published: 'dry_run',
}

const getArtifactForStage = (stageKey: string): Artifact | null => {
  const type = stageArtifactMap[stageKey]
  if (!type) return null
  return getArtifact(type)
}

const isStageProcessing = (stageKey: string): boolean => {
  if (!pipeline.value) return false
  const stageUI = PIPELINE_STAGES_UI.find(s => s.key === stageKey)
  if (!stageUI?.backendStage) return false
  return pipeline.value.status === 'running' && pipeline.value.currentStage === stageUI.backendStage
}

const onStageSelect = (stage: string) => {
  selectedStage.value = stage
}

const loadFeature = async () => {
  const data = await api.get<Feature>(`/features/${featureSlug.value}`)
  feature.value = data
}

const loadPipeline = async () => {
  try {
    const data = await api.get<Pipeline>(`/pipeline/${featureSlug.value}/status`)
    pipeline.value = data
  } catch (e: any) {
    if (e.message?.includes('404')) {
      pipeline.value = null
    }
  }
}

const loadArtifacts = async () => {
  try {
    const data = await api.get<Artifact[]>(`/features/${featureSlug.value}/artifacts`)
    artifacts.value = data
  } catch {
    artifacts.value = []
  }
}

const autoStartPipeline = async () => {
  if (!pipeline.value || pipeline.value.status !== 'idle') return
  try {
    await api.post(`/pipeline/${featureSlug.value}/run`)
    await loadPipeline()
  } catch (e: any) {
    console.error('Failed to auto-start pipeline:', e)
  }
}

const runPipeline = async () => {
  submitting.value = true
  try {
    await api.post(`/pipeline/${featureSlug.value}/run`)
    await loadPipeline()
  } catch (e: any) {
    console.error('Failed to run pipeline:', e)
  } finally {
    submitting.value = false
  }
}

const cancelPipeline = async () => {
  try {
    await api.post(`/pipeline/${featureSlug.value}/cancel`)
    await loadPipeline()
  } catch (e: any) {
    console.error('Failed to cancel pipeline:', e)
  }
}

const restartPipeline = async () => {
  try {
    await api.post(`/pipeline/${featureSlug.value}/restart`)
    logEntries.value = []
    selectedStage.value = null
    await loadPipeline()
  } catch (e: any) {
    console.error('Failed to restart pipeline:', e)
  }
}

const onApprove = async () => {
  try {
    await api.post(`/pipeline/${featureSlug.value}/approve`)
    await loadPipeline()
    await loadArtifacts()
  } catch (e: any) {
    console.error('Failed to approve:', e)
  }
}

const onAnswerQuestions = async () => {
  try {
    await api.post(`/pipeline/${featureSlug.value}/answer`)
    await loadPipeline()
    await loadArtifacts()
  } catch (e: any) {
    console.error('Failed to answer questions:', e)
  }
}

const onRestartStage = async (stageKey: string) => {
  try {
    const stageUI = PIPELINE_STAGES_UI.find(s => s.key === stageKey)
    if (!stageUI?.backendStage) return
    await api.post(`/pipeline/${featureSlug.value}/restart-stage`, { stage: stageUI.backendStage })
    await loadPipeline()
    await loadArtifacts()
  } catch (e: any) {
    console.error('Failed to restart stage:', e)
  }
}

const onFillGaps = async () => {
  if (!pipeline.value?.coverageGaps?.length) return
  fillingGaps.value = true
  try {
    await api.post(`/pipeline/${featureSlug.value}/fill-gaps`, { gaps: pipeline.value.coverageGaps })
  } catch (e: any) {
    console.error('Failed to fill gaps:', e)
    fillingGaps.value = false
  }
}

const onPublished = (jobId: string) => {
  showTestRailDialog.value = false
  console.log('TestRail publish started:', jobId)
}

let eventSource: EventSource | null = null
let pipelineRequestCounter = 0
let refreshTimeout: ReturnType<typeof setTimeout> | null = null

const scheduleRefresh = () => {
  if (refreshTimeout) clearTimeout(refreshTimeout)
  refreshTimeout = setTimeout(refreshPipeline, 200)
}

const refreshPipeline = () => {
  const current = ++pipelineRequestCounter
  loadPipeline().then(async () => {
    if (current === pipelineRequestCounter) {
      await loadArtifacts()
    }
  })
}

const initSSE = () => {
  const featureId = feature.value?.id
  if (!featureId) return

  eventSource?.close()
  eventSource = new EventSource(`/api/events/stream/${featureId}`)

  const handleSseMessage = (type: string, rawData: string) => {
    try {
      const data = JSON.parse(rawData)

      switch (type) {
        case 'pipeline:stage-update':
        case 'pipeline:progress':
        case 'pipeline:blocked':
        case 'pipeline:waiting_for_qa':
        case 'pipeline:completed':
        case 'pipeline:failed':
          scheduleRefresh()
          break

        case 'pipeline:fill-gaps-started':
          fillingGaps.value = true
          scheduleRefresh()
          break

        case 'pipeline:fill-gaps-done':
          fillingGaps.value = false
          scheduleRefresh()
          break

        case 'pipeline:log':
          logEntries.value.push({
            level: data.level || 'info',
            message: data.message || '',
          })
          if (data.level === 'info' && data.message?.includes('Completed')) {
            scheduleRefresh()
          }
          break
      }
    } catch (err) {
      console.error('SSE parse error:', err)
    }
  }

  const eventTypes = [
    'pipeline:stage-update',
    'pipeline:progress',
    'pipeline:blocked',
    'pipeline:waiting_for_qa',
    'pipeline:completed',
    'pipeline:failed',
    'pipeline:log',
    'pipeline:fill-gaps-started',
    'pipeline:fill-gaps-done',
  ]

  eventTypes.forEach((type) => {
    eventSource!.addEventListener(type, (e: MessageEvent) => {
      handleSseMessage(type, e.data)
    })
  })

  eventSource.onmessage = (e) => {
    handleSseMessage('unknown', e.data)
  }

  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = null
    setTimeout(() => {
      if (feature.value?.id) {
        initSSE()
      }
    }, 3000)
  }
}

const loadAll = async () => {
  loading.value = true
  error.value = ''
  logEntries.value = []

  try {
    await loadFeature()
    await loadPipeline()
    await loadArtifacts()
    await autoStartPipeline()
    initSSE()

    // Auto-select first available stage
    if (!selectedStage.value && pipeline.value) {
      const currentStage = pipeline.value.currentStage
      const stageUI = PIPELINE_STAGES_UI.find(s => s.backendStage === currentStage)
      selectedStage.value = stageUI?.key || 'requirements_extracted'
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load feature'
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

onUnmounted(() => {
  eventSource?.close()
})
</script>

<style scoped>
.feature-detail {
  padding: 20px 0;
  scrollbar-gutter: stable;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #1068bf;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-info h1 {
  margin: 0 0 4px 0;
  color: #1a1a2e;
  font-size: 1.4em;
}

.slug {
  color: #666;
  font-size: 0.85em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pipeline-status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pipeline-status-badge.idle { background: #f5f5f5; color: #666; }
.pipeline-status-badge.running { background: #e3f2fd; color: #1068bf; }
.pipeline-status-badge.blocked { background: #fef3c7; color: #d97706; }
.pipeline-status-badge.waiting_for_qa { background: #f5f3ff; color: #7c3aed; }
.pipeline-status-badge.completed { background: #e8f5e9; color: #2da160; }
.pipeline-status-badge.failed { background: #ffebee; color: #dd2b0e; }
.pipeline-status-badge.cancelled { background: #f5f5f5; color: #666; }
.pipeline-status-badge.paused { background: #fff3e0; color: #ef6c00; }

.pipeline-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.pipeline-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pipeline-bar-wrapper {
  flex: 1;
  overflow: visible;
}

.pipeline-bar-wrapper :deep(.pipeline-bar) {
  transform: scale(1.1);
  transform-origin: left center;
}

.pipeline-controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.pipeline-info {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.pipeline-error {
  color: #dd2b0e;
  font-size: 0.9em;
}

.pipeline-progress {
  color: #666;
  font-size: 0.85em;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
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

.btn:hover {
  background: #f5f5f5;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1068bf;
  color: white;
  border-color: #1068bf;
}

.btn-primary:hover:not(:disabled) {
  background: #0c56a0;
}

.btn-danger {
  background: #dd2b0e;
  color: white;
  border-color: #dd2b0e;
}

.btn-danger:hover {
  background: #c4250c;
}

.btn-continue {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.btn-continue:hover {
  background: #d97706;
}

.btn-approve {
  background: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.btn-approve:hover {
  background: #7c3aed;
}

.stage-content {
  margin-bottom: 16px;
}

.stage-processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.logs-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.logs-section h3 {
  margin: 0 0 12px 0;
  color: #1a1a2e;
  font-size: 1em;
}
</style>
