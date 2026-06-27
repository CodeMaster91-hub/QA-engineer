<template>
  <div class="stage-panel">
    <div class="panel-header">
      <h3>Покрытие</h3>
    </div>
    <div class="panel-body">
      <div v-if="coverageGaps?.length" class="coverage-gaps">
        <h4>Пробелы в покрытии</h4>
        <ul>
          <li v-for="(gap, idx) in coverageGaps" :key="idx">{{ gap }}</li>
        </ul>
        <button
          class="btn-fill-gaps"
          @click="$emit('fill-gaps')"
          :disabled="filling"
        >
          {{ filling ? 'Генерация...' : '🔧 Дополнить тест-кейсы' }}
        </button>
      </div>

      <div v-if="coverageReport.length" class="coverage-report">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Требование</th>
                <th>Статус</th>
                <th>Позитивные</th>
                <th>Негативные</th>
                <th>Остальные</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in coverageReport" :key="req.requirement_id">
                <td class="req-id">{{ req.requirement_id }}</td>
                <td><span :class="['badge', statusClass(req.status)]">{{ req.status }}</span></td>
                <td class="tc-positive">{{ formatCoveredBy(req.covered_by, 'positive') }}</td>
                <td class="tc-negative">{{ formatCoveredBy(req.covered_by, 'negative') }}</td>
                <td class="tc-other">{{ formatCoveredOther(req.covered_by) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="error" class="pipeline-error">{{ error }}</div>
      <div v-else class="empty">Нет данных покрытия</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
  coverageGaps?: string[] | null
  filling?: boolean
  error?: string
  testcasesArtifact?: Artifact | null
}>()

defineEmits<{
  'fill-gaps': []
}>()

const coverageReport = computed(() => {
  return props.artifact?.content?.coverage?.requirements_coverage || []
})

const tcTypeMap = computed<Record<string, string>>(() => {
  const cases = props.testcasesArtifact?.content?.cases
  if (!cases?.length) return {}
  const map: Record<string, string> = {}
  for (const tc of cases) {
    if (tc.id) map[tc.id] = tc.type || ''
  }
  return map
})

function formatCoveredBy(coveredBy: string[] | undefined, targetType: string): string {
  if (!coveredBy?.length) return '-'
  const filtered = coveredBy.filter(id => tcTypeMap.value[id] === targetType)
  return filtered.length ? filtered.join(', ') : '-'
}

function formatCoveredOther(coveredBy: string[] | undefined): string {
  if (!coveredBy?.length) return '-'
  const filtered = coveredBy.filter(id => {
    const t = tcTypeMap.value[id]
    return t && t !== 'positive' && t !== 'negative'
  })
  return filtered.length ? filtered.join(', ') : '-'
}

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
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: white;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.panel-header {
  padding: 13px 20px 10px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

.panel-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
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

.tc-positive {
  color: #2da160;
  font-family: monospace;
  font-size: 0.85em;
}

.tc-negative {
  color: #c62828;
  font-family: monospace;
  font-size: 0.85em;
}

.tc-other {
  color: #7b1fa2;
  font-family: monospace;
  font-size: 0.85em;
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

.coverage-report {
  width: 100%;
}

.coverage-gaps {
  margin-bottom: 16px;
  padding: 0 16px 16px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
}

.coverage-gaps h4 {
  margin: 8px 0 8px 0;
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

.coverage-gaps .btn-fill-gaps {
  align-self: flex-end;
  margin-top: 8px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.empty {
  flex: 1;
  min-height: 0;
  color: #999;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pipeline-error {
  flex: 1;
  min-height: 0;
  color: #dd2b0e;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
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
