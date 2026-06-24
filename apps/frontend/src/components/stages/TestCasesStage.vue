<template>
  <div class="stage-panel">
    <h3>Тест-кейсы ({{ cases.length }})</h3>
    <div v-if="cases.length" class="cases-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Steps</th>
            <th>Status</th>
            <th>Requirements</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tc in cases" :key="tc.id">
            <td class="tc-id">{{ tc.id }}</td>
            <td>{{ tc.title }}</td>
            <td>{{ tc.steps?.length || 0 }}</td>
            <td><span :class="['badge', `badge-${tc.status}`]">{{ tc.status }}</span></td>
            <td class="req-ids">{{ (tc.requirement_ids || []).join(', ') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">Нет тест-кейсов</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
}>()

const cases = computed(() => {
  const content = props.artifact?.content
  return content?.cases || []
})
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

.cases-table {
  overflow-x: auto;
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

.req-ids {
  font-family: monospace;
  font-size: 0.85em;
  color: #666;
}

.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-draft { background: #f5f5f5; color: #666; }
.badge-approved { background: #e8f5e9; color: #2da160; }
.badge-needs_clarification { background: #fff3e0; color: #ef6c00; }
.badge-rejected { background: #ffebee; color: #c62828; }

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}
</style>
