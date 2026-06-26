<template>
  <div class="stage-panel">
    <h3>Dry Run</h3>

    <div v-if="dryRunContent" class="dryrun-content">
      <pre class="json-view">{{ formatJson(dryRunContent) }}</pre>
    </div>
    <div v-else class="empty">Dry run не выполнялся</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
}>()

const dryRunContent = computed(() => props.artifact?.content || null)

const formatJson = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
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

.json-view {
  margin: 0;
  font-family: monospace;
  font-size: 0.85em;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f9f9f9;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #eee;
  max-height: 500px;
  overflow-y: auto;
}

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}
</style>
