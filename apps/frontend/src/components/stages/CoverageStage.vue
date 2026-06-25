<template>
  <div class="stage-panel">
    <h3>Покрытие</h3>

    <div v-if="coverageMatrix" class="coverage-matrix">
      <div class="markdown-rendered" v-html="renderedMatrix"></div>
    </div>

    <div v-else-if="coverageReport.length" class="coverage-report">
      <table>
        <thead>
          <tr>
            <th>Requirement</th>
            <th>Status</th>
            <th>Covered By</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in coverageReport" :key="req.requirement_id">
            <td class="req-id">{{ req.requirement_id }}</td>
            <td><span :class="['badge', statusClass(req.status)]">{{ req.status }}</span></td>
            <td>{{ (req.covered_by || []).join(', ') || '-' }}</td>
            <td>{{ req.notes || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty">Нет данных покрытия</div>

    <div v-if="coverageGaps?.length" class="coverage-gaps">
      <div class="gaps-header">
        <h4>Пробелы в покрытии</h4>
        <button
          class="btn-fill-gaps"
          @click="$emit('fill-gaps')"
          :disabled="filling"
        >
          {{ filling ? 'Генерация...' : '🔧 Дополнить тест-кейсы' }}
        </button>
      </div>
      <ul>
        <li v-for="(gap, idx) in coverageGaps" :key="idx">{{ gap }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  artifact: Artifact | null
  coverageGaps?: string[] | null
  filling?: boolean
}>()

defineEmits<{
  'fill-gaps': []
}>()

const coverageMatrix = computed(() => props.artifact?.content?.coverage_matrix_markdown || '')
const renderedMatrix = computed(() => renderMarkdown(coverageMatrix.value))

const coverageReport = computed(() => {
  return props.artifact?.content?.coverage?.requirements_coverage || []
})

const statusClass = (status: string) => {
  const s = (status || '').toLowerCase()
  if (s.includes('covered') && !s.includes('not') && !s.includes('partial')) return 'status-covered'
  if (s.includes('partial')) return 'status-partial'
  if (s.includes('not') || s.includes('missing')) return 'status-not-covered'
  if (s.includes('blocked')) return 'status-blocked'
  return 'status-default'
}
</script>

<style scoped>
.stage-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stage-panel h3 {
  margin: 0 0 16px 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  font-weight: 600;
  color: #303030;
  background: #f9f9f9;
}

.req-id {
  font-family: monospace;
  font-weight: 500;
  color: #1068bf;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
}

.status-covered { background: #e8f5e9; color: #2e7d32; }
.status-partial { background: #fff3e0; color: #ef6c00; }
.status-not-covered { background: #ffebee; color: #c62828; }
.status-blocked { background: #f3e5f5; color: #7b1fa2; }
.status-default { background: #f5f5f5; color: #666; }

.coverage-gaps {
  margin-top: 16px;
  padding: 16px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
}

.coverage-gaps h4 {
  margin: 0 0 8px 0;
  color: #92400e;
  font-size: 0.95em;
}

.coverage-gaps ul {
  margin: 0;
  padding-left: 20px;
}

.coverage-gaps li {
  font-size: 0.9em;
  color: #78350f;
  margin-bottom: 4px;
}

.markdown-rendered :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.markdown-rendered :deep(th), .markdown-rendered :deep(td) { padding: 8px 12px; border: 1px solid #eee; text-align: left; }
.markdown-rendered :deep(th) { background: #f9f9f9; font-weight: 600; }

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}

.gaps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.btn-fill-gaps {
  padding: 4px 12px;
  border: 1px solid #1068bf;
  border-radius: 4px;
  background: white;
  color: #1068bf;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-fill-gaps:hover:not(:disabled) {
  background: #1068bf;
  color: white;
}

.btn-fill-gaps:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
