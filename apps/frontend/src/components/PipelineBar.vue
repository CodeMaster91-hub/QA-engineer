<template>
  <div class="pipeline-bar">
    <div
      v-for="(stageObj, idx) in stages"
      :key="stageObj.key"
      class="pipeline-stage"
      :class="{ selected: selectedStage === stageObj.key }"
      @click="$emit('select:stage', stageObj.key)"
    >
      <div
        class="stage-node"
        :class="statusClass(stageObj.status)"
        @mouseenter="hoveredStage = stageObj.key"
        @mouseleave="hoveredStage = null"
      >
        <svg v-if="stageObj.status === 'running'" class="stage-icon spinning" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="32" stroke-dashoffset="8" stroke-linecap="round"/>
        </svg>

        <svg v-else-if="stageObj.status === 'paused'" class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <line x1="6" y1="5" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="10" y1="5" x2="10" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>

        <svg v-else-if="stageObj.status === 'success'" class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M5 8.5L7 10.5L11 5.5" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <svg v-else-if="stageObj.status === 'failed'" class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>

        <svg v-else-if="stageObj.status === 'blocked'" class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M5 8H11" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>

        <svg v-else-if="stageObj.status === 'queued'" class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M8 8 L8 1 A7 7 0 0 0 1.94 11.5 Z" fill="white"/>
        </svg>

        <svg v-else class="stage-icon" viewBox="0 0 16 16" width="16" height="16">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M8 8 L8 1 A7 7 0 0 0 1.94 11.5 Z" fill="white"/>
        </svg>

        <!-- Restart overlay on hover -->
        <div
          v-if="hoveredStage === stageObj.key && stageObj.status !== 'queued' && stageObj.status !== 'running'"
          class="restart-overlay"
          @click.stop="$emit('restart:stage', stageObj.key)"
          title="Перезапустить этап"
        >
          <svg viewBox="0 0 16 16" width="14" height="14">
            <path d="M13.5 8a5.5 5.5 0 0 1-9.78 3.44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M2.5 8a5.5 5.5 0 0 1 9.78-3.44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M13.5 3.5v2.5h-2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2.5 12.5v-2.5h2.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <span class="stage-label">{{ stageObj.label }}</span>
      <div v-if="idx < stages.length - 1" class="stage-connector" :class="connectorClass(stageObj.status)"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface StageInfo {
  key: string
  label: string
  status: 'queued' | 'running' | 'success' | 'failed' | 'canceled' | 'blocked' | 'paused'
}

defineProps<{
  stages: StageInfo[]
  selectedStage?: string
}>()

defineEmits<{
  'select:stage': [stage: string]
  'restart:stage': [stage: string]
}>()

const hoveredStage = ref<string | null>(null)

const statusClass = (status: string) => {
  return {
    'status-created': status === 'created',
    'status-running': status === 'running',
    'status-success': status === 'success',
    'status-failed': status === 'failed',
    'status-canceled': status === 'canceled',
    'status-blocked': status === 'blocked',
    'status-queued': status === 'queued',
  }
}

const connectorClass = (status: string) => {
  return {
    'connector-done': status === 'success',
    'connector-active': status === 'running',
    'connector-failed': status === 'failed',
    'connector-blocked': status === 'blocked',
  }
}
</script>

<style scoped>
.pipeline-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 8px;
  overflow: hidden;
}

.pipeline-stage {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.pipeline-stage.selected {
  box-shadow: 0 0 0 4px #1068bf22;
  outline: 2px solid #1068bf;
  outline-offset: -2px;
  padding: 8px 12px;
}

.pipeline-stage:hover .stage-label {
  color: #1068bf;
}

.stage-node {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  position: relative;
}

.stage-node.selected {
  border-color: #1068bf;
}

.stage-icon {
  display: block;
}

.restart-overlay {
  position: absolute;
  inset: -2px;
  background: #dbdbdb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #555;
  transition: all 0.15s ease;
  border: 2px solid #dbdbdb;
  z-index: 2;
}

.restart-overlay:hover {
  background: #999;
  border-color: #999;
  color: white;
}

.pipeline-stage:hover:has(.restart-overlay) .stage-icon {
  opacity: 0;
}

.status-paused { color: #8b5cf6; }
.status-running { color: #1068bf; }
.status-success { color: #2da160; }
.status-failed { color: #dd2b0e; }
.status-canceled { color: #dbdbdb; }
.status-blocked { color: #f59e0b; }
.status-queued { color: #1068bf; }

.stage-label {
  font-size: 0.75em;
  font-weight: 500;
  color: #303030;
  white-space: nowrap;
  transition: color 0.2s;
}

.stage-connector {
  width: 24px;
  height: 2px;
  background: #dbdbdb;
  margin: 0 4px;
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.connector-done { background: #2da160; }
.connector-active { background: linear-gradient(90deg, #2da160 0%, #1068bf 100%); }
.connector-failed { background: #dd2b0e; }
.connector-blocked { background: #f59e0b; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>
