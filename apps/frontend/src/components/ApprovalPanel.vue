<template>
  <div class="approval-panel">
    <div class="panel-header">
      <h3>Требуется одобрение</h3>
      <span class="status-badge">{{ stageLabel }}</span>
    </div>

    <div class="panel-body">
      <div v-if="coverageGaps && coverageGaps.length" class="gaps-section">
        <div class="gaps-title">Coverage Gaps:</div>
        <ul class="gaps-list">
          <li v-for="(gap, idx) in coverageGaps" :key="idx">{{ gap }}</li>
        </ul>
      </div>

      <div class="approval-message">
        <template v-if="stage === 'review'">
          Ревью завершено. Проверьте результаты и одобрите для продолжения.
        </template>
        <template v-else-if="stage === 'coverage_audited'">
          Обнаружены пробелы в покрытии. Проверьте gaps выше и одобрите для продолжения.
        </template>
        <template v-else-if="stage === 'dry_run_completed'">
          Dry-run завершён. Одобрите для публикации в TestRail.
        </template>
        <template v-else>
          Этап завершён. Ожидает вашего одобрения.
        </template>
      </div>
    </div>

    <div class="panel-actions">
      <button class="btn btn-approve" @click="$emit('approve')">
        Одобрить и продолжить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  stage: string
  coverageGaps?: string[] | null
}>()

defineEmits<{
  approve: []
}>()

const stageLabel = computed(() => {
  const labels: Record<string, string> = {
    review: 'Review',
    coverage_audited: 'Coverage',
    dry_run_completed: 'Dry Run',
  }
  return labels[props.stage] || props.stage
})
</script>

<style scoped>
.approval-panel {
  background: #f5f3ff;
  border: 1px solid #c4b5fd;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ede9fe;
  border-bottom: 1px solid #c4b5fd;
}

.panel-header h3 {
  margin: 0;
  font-size: 0.95em;
  color: #5b21b6;
}

.status-badge {
  background: #8b5cf6;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 600;
}

.panel-body {
  padding: 16px;
}

.gaps-section {
  margin-bottom: 16px;
}

.gaps-title {
  font-weight: 600;
  font-size: 0.9em;
  color: #5b21b6;
  margin-bottom: 8px;
}

.gaps-list {
  margin: 0;
  padding-left: 20px;
}

.gaps-list li {
  font-size: 0.85em;
  color: #374151;
  margin-bottom: 4px;
}

.approval-message {
  font-size: 0.9em;
  color: #4c1d95;
}

.panel-actions {
  padding: 12px 16px;
  border-top: 1px solid #c4b5fd;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.btn-approve {
  background: #7c3aed;
  color: white;
}

.btn-approve:hover {
  background: #6d28d9;
}
</style>
