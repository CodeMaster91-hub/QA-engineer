<template>
  <div class="stage-panel">
    <h3>Тест план</h3>
    <div v-if="testPlanMarkdown" class="markdown-rendered" v-html="renderedTestPlan"></div>
    <div v-else class="empty">Тест план не сформирован</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  artifact: Artifact | null
}>()

const testPlanMarkdown = computed(() => props.artifact?.content?.test_plan_markdown || '')
const renderedTestPlan = computed(() => renderMarkdown(testPlanMarkdown.value))
</script>

<style scoped>
.stage-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
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

.markdown-rendered {
  width: 100%;
}

.markdown-rendered :deep(h1) { font-size: 1.4em; margin: 16px 0 8px; }
.markdown-rendered :deep(h2) { font-size: 1.2em; margin: 14px 0 6px; }
.markdown-rendered :deep(h3) { font-size: 1.1em; margin: 12px 0 6px; }
.markdown-rendered :deep(p) { margin: 8px 0; line-height: 1.6; }
.markdown-rendered :deep(ul) { margin: 8px 0; padding-left: 24px; }
.markdown-rendered :deep(ol) { margin: 8px 0; padding-left: 24px; }
.markdown-rendered :deep(li) { margin: 4px 0; line-height: 1.5; }
.markdown-rendered :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.markdown-rendered :deep(th), .markdown-rendered :deep(td) { padding: 8px 12px; border: 1px solid #eee; text-align: left; }
.markdown-rendered :deep(th) { background: #f9f9f9; font-weight: 600; }
.markdown-rendered :deep(strong) { font-weight: 600; }

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
