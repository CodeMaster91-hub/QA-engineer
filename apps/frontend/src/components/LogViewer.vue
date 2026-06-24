<template>
  <div class="log-viewer" ref="logContainer">
    <pre>
      <code v-for="(entry, i) in logs" :key="i" :class="levelClass(entry.level)">{{ entry.message }}</code>
    </pre>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

type LogEntry = { level: 'info' | 'warn' | 'error'; message: string }

const props = defineProps<{ logs: LogEntry[] }>()
const logContainer = ref<HTMLElement | null>(null)

const levelClass = (level: string) => {
  return {
    'log-info': level === 'info',
    'log-warn': level === 'warn',
    'log-error': level === 'error',
  }
}

const scrollToBottom = () => {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}

watch(
  () => props.logs.length,
  () => {
    // after new log entry, scroll
    scrollToBottom()
  },
)

onMounted(() => {
  scrollToBottom()
})
</script>

<style scoped>
.log-viewer {
  max-height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #eee;
  padding: 0.5rem;
  border-radius: 4px;
  font-family: monospace;
}
.log-info { color: #ddd; }
.log-warn { color: #ffb86c; }
.log-error { color: #ff5555; }
</style>
