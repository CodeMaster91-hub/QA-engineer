<template>
  <div class="questions-panel">
    <div class="panel-header">
      <h3>Открытые вопросы</h3>
      <span class="question-count">{{ questions.length }}</span>
    </div>
    <div class="questions-list">
      <div v-for="(q, idx) in questions" :key="idx" class="question-item">
        <div class="question-header">
          <span :class="['severity-badge', `severity-${q.severity}`]">{{ q.severity }}</span>
          <span class="question-stage">{{ q.stage }}</span>
        </div>
        <div class="question-text">{{ q.question }}</div>
        <div class="question-reason" v-if="q.reason">{{ q.reason }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PipelineQuestion } from '@/api/types'

defineProps<{
  questions: PipelineQuestion[]
}>()
</script>

<style scoped>
.questions-panel {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fef3c7;
  border-bottom: 1px solid #fcd34d;
}

.panel-header h3 {
  margin: 0;
  font-size: 0.95em;
  color: #92400e;
}

.question-count {
  background: #f59e0b;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8em;
  font-weight: 600;
}

.questions-list {
  padding: 12px 16px;
  max-height: 300px;
  overflow-y: auto;
}

.question-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #e5e7eb;
}

.question-item:last-child {
  margin-bottom: 0;
}

.question-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.severity-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-high { background: #fee2e2; color: #dc2626; }
.severity-medium { background: #fef3c7; color: #d97706; }
.severity-low { background: #dbeafe; color: #2563eb; }

.question-stage {
  font-size: 0.75em;
  color: #666;
}

.question-text {
  font-size: 0.9em;
  color: #1f2937;
  margin-bottom: 4px;
}

.question-reason {
  font-size: 0.8em;
  color: #6b7280;
}
</style>
