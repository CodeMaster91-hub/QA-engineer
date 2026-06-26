<template>
  <div class="stage-panel">
    <h3>Сводный отчёт</h3>

    <div v-if="hasData" class="report">
      <!-- Statistics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ requirementsCount }}</div>
          <div class="stat-label">Требований</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ testCasesCount }}</div>
          <div class="stat-label">Тест-кейсов</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ coveragePercent }}%</div>
          <div class="stat-label">Покрытие</div>
        </div>
        <div class="stat-card" v-if="reviewQuality">
          <div class="stat-value">{{ qualityLabel }}</div>
          <div class="stat-label">Качество</div>
        </div>
      </div>

      <!-- Requirements Coverage -->
      <div class="report-section" v-if="coverageReport.length">
        <h4>Требования</h4>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Статус</th>
              <th>Кейсы</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in coverageReport" :key="req.requirement_id">
              <td class="req-id">{{ req.requirement_id }}</td>
              <td>
                <span :class="['badge', statusClass(req.status)]">
                  {{ statusIcon(req.status) }} {{ req.status }}
                </span>
              </td>
              <td class="tc-list">{{ formatCases(req.covered_by) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Strengths -->
      <div class="report-section" v-if="reviewStrengths?.length">
        <h4 class="section-strengths">Сильные стороны</h4>
        <ul>
          <li v-for="(s, i) in reviewStrengths" :key="i">{{ s }}</li>
        </ul>
      </div>

      <!-- Weaknesses -->
      <div class="report-section" v-if="reviewWeaknesses?.length">
        <h4 class="section-weaknesses">Замечания</h4>
        <ul>
          <li v-for="(w, i) in reviewWeaknesses" :key="i">{{ w }}</li>
        </ul>
      </div>

      <!-- Recommendations -->
      <div class="report-section" v-if="reviewRecommendations?.length">
        <h4 class="section-recommendations">Рекомендации</h4>
        <ul>
          <li v-for="(r, i) in reviewRecommendations" :key="i">{{ r }}</li>
        </ul>
      </div>

      <!-- Summary -->
      <div class="report-section" v-if="reviewSummary">
        <h4>Резюме</h4>
        <p class="summary-text">{{ reviewSummary }}</p>
      </div>

      <!-- Questions -->
      <div class="report-section" v-if="pipelineQuestions?.length">
        <h4 class="section-questions">Вопросы</h4>
        <div class="questions-list">
          <div v-for="(q, i) in pipelineQuestions" :key="i" class="question-card">
            <div class="question-header">
              <span class="question-severity" :class="severityClass(q.severity)">
                {{ severityLabel(q.severity) }}
              </span>
              <span class="question-stage">{{ q.stage }}</span>
            </div>
            <p class="question-text">{{ q.question }}</p>
            <p class="question-reason" v-if="q.reason">{{ q.reason }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty">Нет данных</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
  requirementsArtifact: Artifact | null
  testcasesArtifact: Artifact | null
  coverageArtifact: Artifact | null
  pipelineQuestions?: Array<{
    question: string
    reason: string
    severity: string
    stage: string
  }> | null
}>()

const hasData = computed(() => {
  return (
    props.artifact?.content ||
    props.coverageArtifact?.content ||
    props.pipelineQuestions?.length
  )
})

const requirementsCount = computed(() => {
  return props.requirementsArtifact?.content?.requirements?.length || 0
})

const testCasesCount = computed(() => {
  return props.testcasesArtifact?.content?.cases?.length || 0
})

const coverageReport = computed(() => {
  return props.coverageArtifact?.content?.coverage?.requirements_coverage || []
})

const coveragePercent = computed(() => {
  const report = coverageReport.value
  if (!report.length) return 0
  const covered = report.filter(
    (r: any) => r.status?.toLowerCase().includes('covered') && !r.status?.toLowerCase().includes('not'),
  ).length
  return Math.round((covered / report.length) * 100)
})

const reviewSummary = computed(() => props.artifact?.content?.summary || '')
const reviewQuality = computed(() => props.artifact?.content?.overall_quality || '')
const reviewStrengths = computed(() => props.artifact?.content?.strengths || [])
const reviewWeaknesses = computed(() => props.artifact?.content?.weaknesses || [])
const reviewRecommendations = computed(() => props.artifact?.content?.recommendations || [])

const qualityLabel = computed(() => {
  const map: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' }
  return map[reviewQuality.value] || reviewQuality.value
})

const statusClass = (status: string) => {
  const s = (status || '').toLowerCase()
  if (s.includes('covered') && !s.includes('not') && !s.includes('partial')) return 'status-covered'
  if (s.includes('partial')) return 'status-partial'
  if (s.includes('not') || s.includes('missing')) return 'status-not-covered'
  return 'status-default'
}

const statusIcon = (status: string) => {
  const s = (status || '').toLowerCase()
  if (s.includes('covered') && !s.includes('not') && !s.includes('partial')) return '✓'
  if (s.includes('partial')) return '⚠'
  return '✗'
}

const formatCases = (cases: string[] | undefined) => {
  if (!cases?.length) return '-'
  return cases.join(', ')
}

const severityClass = (severity: string) => {
  return `severity-${severity?.toLowerCase() || 'medium'}`
}

const severityLabel = (severity: string) => {
  const map: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' }
  return map[severity?.toLowerCase()] || severity || 'Medium'
}
</script>

<style scoped>
.stage-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.stage-panel h3 {
  margin: 0 0 16px 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  font-size: 1.5em;
  font-weight: 700;
  color: #1068bf;
}

.stat-label {
  font-size: 0.75em;
  color: #666;
  margin-top: 2px;
}

.report-section {
  margin-bottom: 16px;
}

.report-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.9em;
  color: #303030;
}

.report-section ul {
  margin: 0;
  padding-left: 18px;
}

.report-section li {
  font-size: 0.85em;
  color: #444;
  margin-bottom: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85em;
}

th, td {
  padding: 8px 10px;
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

.tc-list {
  font-size: 0.85em;
  color: #555;
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
.status-default { background: #f5f5f5; color: #666; }

.summary-text {
  margin: 0;
  font-size: 0.9em;
  color: #444;
  line-height: 1.5;
  background: #f7f8fa;
  padding: 12px;
  border-radius: 6px;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-card {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 10px 12px;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.question-severity {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
}

.severity-high { background: #ffebee; color: #c62828; }
.severity-medium { background: #fff3e0; color: #ef6c00; }
.severity-low { background: #e8f5e9; color: #2e7d32; }

.question-stage {
  font-size: 0.7em;
  color: #999;
  font-family: monospace;
}

.question-text {
  margin: 0 0 4px 0;
  font-size: 0.85em;
  color: #78350f;
}

.question-reason {
  margin: 0;
  font-size: 0.8em;
  color: #92400e;
  font-style: italic;
}

.section-strengths { color: #2e7d32; }
.section-weaknesses { color: #ef6c00; }
.section-recommendations { color: #1068bf; }
.section-questions { color: #92400e; }

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}
</style>
