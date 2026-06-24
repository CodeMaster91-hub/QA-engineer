<template>
  <div class="stage-panel">
    <h3>Сводка требований</h3>
    <div v-if="requirements.length" class="requirements-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Priority</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in requirements" :key="req.id">
            <td class="req-id">{{ req.id }}</td>
            <td>{{ req.title || req.description }}</td>
            <td><span :class="['badge', `badge-${req.priority}`]">{{ req.priority }}</span></td>
            <td>{{ req.type }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">Нет требований</div>

    <QuestionsPanel
      v-if="questions.length"
      :questions="questions"
      @answer="$emit('answer')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact, PipelineQuestion } from '@/api/types'
import QuestionsPanel from '@/components/QuestionsPanel.vue'

const props = defineProps<{
  artifact: Artifact | null
  questions: PipelineQuestion[]
}>()

defineEmits<{
  answer: []
}>()

const requirements = computed(() => props.artifact?.content?.requirements || [])
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

.requirements-table {
  margin-bottom: 16px;
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
  text-transform: uppercase;
}

.badge-high { background: #ffebee; color: #c62828; }
.badge-medium { background: #fff3e0; color: #ef6c00; }
.badge-low { background: #e8f5e9; color: #2e7d32; }

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}
</style>
