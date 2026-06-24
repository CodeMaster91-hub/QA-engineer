<template>
  <div class="pipeline">
    <h1>Pipeline Monitor</h1>
    
    <div v-if="pipelines.length === 0" class="empty">
      <p>Нет активных pipeline'ов</p>
      <router-link to="/features" class="btn">Перейти к фичам</router-link>
    </div>
    
    <div v-else class="pipeline-list">
      <div v-for="pipeline in pipelines" :key="pipeline.id" class="pipeline-card">
        <div class="pipeline-header">
          <div>
            <h3>{{ pipeline.feature?.title || pipeline.featureSlug }}</h3>
            <span class="slug">{{ pipeline.featureSlug }}</span>
          </div>
          <span :class="['status', pipeline.status]">{{ pipeline.status }}</span>
        </div>
        
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: getProgressPercent(pipeline) + '%' }"></div>
          </div>
          <span class="progress-text">{{ getProgressText(pipeline) }}</span>
        </div>
        
        <div class="stages">
          <div 
            v-for="stage in stages" 
            :key="stage.key"
            :class="['stage', getStageClass(pipeline, stage.key)]"
          >
            <span class="stage-icon">{{ getStageIcon(pipeline, stage.key) }}</span>
            <span class="stage-name">{{ stage.label }}</span>
          </div>
        </div>
        
        <div v-if="pipeline.error" class="error">
          {{ pipeline.error }}
        </div>
        
        <div class="actions">
          <button 
            v-if="pipeline.status === 'idle' || pipeline.status === 'failed'"
            @click="runPipeline(pipeline.featureSlug)"
            class="btn btn-primary"
          >
            Запустить
          </button>
          <button 
            v-if="pipeline.status === 'running'"
            @click="cancelPipeline(pipeline.featureSlug)"
            class="btn btn-danger"
          >
            Отменить
          </button>
          <button 
            v-if="pipeline.status === 'completed'"
            @click="restartPipeline(pipeline.featureSlug)"
            class="btn"
          >
            Перезапустить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '@/api/client'

const pipelines = ref<any[]>([])
const stages = [
  { key: 'source_ingested', label: 'Source' },
  { key: 'requirements_extracted', label: 'Requirements' },
  { key: 'draft_created', label: 'Draft' },
  { key: 'coverage_audited', label: 'Coverage' },
  { key: 'review', label: 'Review' },
  { key: 'dry_run_completed', label: 'Dry Run' },
]

const loadPipelines = async () => {
  try {
    const response = await api.get('/features?limit=100')
    const features = response.data.items || response.data || []
    
    const pipelinePromises = features.map(async (f: any) => {
      try {
        const res = await api.get(`/pipeline/${f.slug}/status`)
        return { ...res.data, feature: f }
      } catch {
        return { featureSlug: f.slug, feature: f, status: 'idle' }
      }
    })
    
    pipelines.value = await Promise.all(pipelinePromises)
  } catch (e) {
    console.error('Failed to load pipelines:', e)
  }
}

const getProgressPercent = (pipeline: any) => {
  if (pipeline.status === 'completed') return 100
  if (pipeline.status === 'idle') return 0
  if (!pipeline.currentStage) return 0
  
  const idx = stages.findIndex(s => s.key === pipeline.currentStage)
  if (idx === -1) return 0
  return Math.round(((idx + 1) / stages.length) * 100)
}

const getProgressText = (pipeline: any) => {
  if (pipeline.status === 'completed') return 'Завершено'
  if (pipeline.status === 'idle') return 'Ожидание'
  if (pipeline.status === 'failed') return 'Ошибка'
  if (pipeline.status === 'cancelled') return 'Отменено'
  return `${getProgressPercent(pipeline)}%`
}

const getStageClass = (pipeline: any, stageKey: string) => {
  if (pipeline.status === 'idle') return 'pending'
  
  const currentIdx = stages.findIndex(s => s.key === pipeline.currentStage)
  const stageIdx = stages.findIndex(s => s.key === stageKey)
  
  if (pipeline.status === 'completed') return 'done'
  if (stageIdx < currentIdx) return 'done'
  if (stageIdx === currentIdx) return 'active'
  return 'pending'
}

const getStageIcon = (pipeline: any, stageKey: string) => {
  const cls = getStageClass(pipeline, stageKey)
  if (cls === 'done') return '✓'
  if (cls === 'active') return '⟳'
  return '○'
}

const runPipeline = async (slug: string) => {
  try {
    await api.post(`/pipeline/${slug}/run`)
    await loadPipelines()
  } catch (e) {
    console.error('Failed to run pipeline:', e)
  }
}

const cancelPipeline = async (slug: string) => {
  try {
    await api.post(`/pipeline/${slug}/cancel`)
    await loadPipelines()
  } catch (e) {
    console.error('Failed to cancel pipeline:', e)
  }
}

const restartPipeline = async (slug: string) => {
  try {
    await api.post(`/pipeline/${slug}/restart`)
    await loadPipelines()
  } catch (e) {
    console.error('Failed to restart pipeline:', e)
  }
}

let interval: any

onMounted(() => {
  loadPipelines()
  interval = setInterval(loadPipelines, 5000)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<style scoped>
.pipeline {
  padding: 20px 0;
}

h1 {
  color: #1a1a2e;
  margin-bottom: 24px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty p {
  color: #666;
  margin-bottom: 20px;
}

.pipeline-list {
  display: grid;
  gap: 16px;
}

.pipeline-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pipeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.pipeline-header h3 {
  margin-bottom: 4px;
  color: #1a1a2e;
}

.slug {
  color: #666;
  font-size: 0.85em;
}

.status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  text-transform: uppercase;
}

.status.idle { background: #f5f5f5; color: #666; }
.status.running { background: #e3f2fd; color: #1565c0; }
.status.completed { background: #e8f5e9; color: #2e7d32; }
.status.failed { background: #ffebee; color: #c62828; }
.status.cancelled { background: #fff3e0; color: #ef6c00; }

.progress-section {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #1a1a2e;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85em;
  color: #666;
}

.stages {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  background: #f5f5f5;
  color: #666;
}

.stage.done {
  background: #e8f5e9;
  color: #2e7d32;
}

.stage.active {
  background: #e3f2fd;
  color: #1565c0;
}

.stage-icon {
  font-weight: bold;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 0.9em;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  background: #e0e0e0;
  color: #333;
}

.btn-primary {
  background: #1a1a2e;
  color: white;
}

.btn-danger {
  background: #c62828;
  color: white;
}
</style>
