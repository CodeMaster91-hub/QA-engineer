<template>
  <div class="stage-panel">
    <div class="panel-header">
      <h3>Dry Run — Пробный запуск</h3>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ summary.total }}</div>
          <div class="stat-label">Всего кейсов</div>
        </div>
        <div class="stat-card stat-approved">
          <div class="stat-value">{{ summary.approved }}</div>
          <div class="stat-label">Апрувнуты</div>
        </div>
        <div class="stat-card stat-draft">
          <div class="stat-value">{{ summary.draft }}</div>
          <div class="stat-label">Черновики</div>
        </div>
        <div class="stat-card stat-sections">
          <div class="stat-value">{{ summary.existingSections }} + {{ summary.newSections }}</div>
          <div class="stat-label">Секции</div>
        </div>
      </div>
    </div>

    <div class="panel-body">
      <template v-if="dryRunData">
        <div class="split-container">
          <div class="cases-panel">
            <div class="panel-title">Тест-кейсы ({{ cases.length }})</div>
            <div class="cases-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Секция</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tc in cases" :key="tc.id">
                    <td class="tc-id">{{ tc.id }}</td>
                    <td>{{ tc.title }}</td>
                    <td>
                      <span v-if="tc.targetSectionId" class="section-existing">
                        {{ getSectionName(tc.targetSectionId) }}
                      </span>
                      <span v-else-if="tc.targetSectionName" class="section-new">
                        [Новая] {{ tc.targetSectionName }}
                      </span>
                      <span v-else class="section-unassigned">—</span>
                    </td>
                    <td>
                      <span :class="['badge', `badge-${tc.status}`]">
                        {{ tc.status === 'approved' ? 'Апрув' : 'Драфт' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="sections-panel">
            <div class="panel-title">Секции TestRail</div>

            <div v-if="existingSections.length" class="section-group">
              <div class="section-group-label">Существующие</div>
              <div
                v-for="sec in existingSections"
                :key="sec.id"
                class="section-item"
              >
                <span class="section-dot section-dot-existing"></span>
                {{ sec.name }}
                <span class="section-count">{{ getCasesForSection(sec.id).length }}</span>
              </div>
            </div>

            <div v-if="newSections.length" class="section-group">
              <div class="section-group-label">Новые (к созданию)</div>
              <div
                v-for="(sec, idx) in newSections"
                :key="idx"
                class="section-item"
              >
                <span class="section-dot section-dot-new"></span>
                {{ sec.name }}
                <span class="section-count">{{ getCasesForNewSection(sec.name).length }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="empty">Dry run не выполнялся</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact, DryRunArtifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
}>()

const dryRunData = computed<DryRunArtifact | null>(() => {
  const content = props.artifact?.content
  if (!content?.cases) return null
  return content as unknown as DryRunArtifact
})

const summary = computed(() => {
  return dryRunData.value?.summary || { total: 0, approved: 0, draft: 0, existingSections: 0, newSections: 0 }
})

const cases = computed(() => dryRunData.value?.cases || [])

const existingSections = computed(() => dryRunData.value?.sections?.existing || [])

const newSections = computed(() => dryRunData.value?.sections?.new || [])

const getSectionName = (sectionId: string) => {
  const section = existingSections.value.find((s) => s.id === sectionId)
  return section?.name || `#${sectionId}`
}

const getCasesForSection = (sectionId: string) => {
  return cases.value.filter((c) => c.targetSectionId === sectionId)
}

const getCasesForNewSection = (sectionName: string) => {
  return cases.value.filter((c) => c.targetSectionName === sectionName)
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
  padding: 16px 20px 12px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0 0 12px 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

.panel-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  height: 74px;
  display: flex;
  flex-direction: column;
  justify-content: center;
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

.stat-approved .stat-value {
  color: #2da160;
}

.stat-draft .stat-value {
  color: #999;
}

.stat-sections .stat-value {
  color: #1565c0;
}

.split-container {
  display: flex;
  gap: 16px;
}

.cases-panel {
  flex: 65;
  min-width: 0;
}

.sections-panel {
  flex: 35;
  border-left: 1px solid #eee;
  padding-left: 16px;
}

.panel-title {
  font-weight: 600;
  color: #303030;
  margin-bottom: 12px;
}

.cases-table {
  overflow-x: auto;
  overflow-y: auto;
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

.tc-id {
  font-family: monospace;
  font-weight: 500;
  color: #1068bf;
}

.section-existing {
  color: #2da160;
  font-size: 0.9em;
}

.section-new {
  color: #1565c0;
  font-size: 0.9em;
  font-style: italic;
}

.section-unassigned {
  color: #ccc;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-approved {
  background: #e8f5e9;
  color: #2da160;
}

.badge-draft {
  background: #f5f5f5;
  color: #666;
}

.section-group {
  margin-bottom: 16px;
}

.section-group-label {
  font-size: 0.8em;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.9em;
}

.section-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.section-dot-existing {
  background: #2da160;
}

.section-dot-new {
  background: #1565c0;
}

.section-count {
  margin-left: auto;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 0.8em;
  color: #666;
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
</style>
