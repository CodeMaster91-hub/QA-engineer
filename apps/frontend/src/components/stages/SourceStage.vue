<template>
  <div class="stage-panel">
    <h3>Источник</h3>
    <div class="markdown-rendered" v-html="renderedText"></div>
    <div v-if="images.length" class="source-images">
      <div v-for="(img, idx) in images" :key="idx" class="source-image">
        <img :src="img.data" :alt="img.name || `Image ${idx + 1}`" />
        <span v-if="img.name" class="image-name">{{ img.name }}</span>
      </div>
    </div>
    <div v-if="!text && !images.length" class="empty">Нет данных источника</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artifact } from '@/api/types'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  artifact: Artifact | null
}>()

const text = computed(() => props.artifact?.content?.text || '')
const images = computed(() => props.artifact?.content?.images || [])
const renderedText = computed(() => renderMarkdown(text.value))
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

.markdown-rendered :deep(h1) { font-size: 1.4em; margin: 16px 0 8px; }
.markdown-rendered :deep(h2) { font-size: 1.2em; margin: 14px 0 6px; }
.markdown-rendered :deep(h3) { font-size: 1.1em; margin: 12px 0 6px; }
.markdown-rendered :deep(p) { margin: 8px 0; line-height: 1.6; }
.markdown-rendered :deep(ul) { margin: 8px 0; padding-left: 24px; }
.markdown-rendered :deep(li) { margin: 4px 0; line-height: 1.5; }
.markdown-rendered :deep(code) { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
.markdown-rendered :deep(pre) { background: #1e1e1e; color: #eee; padding: 12px; border-radius: 4px; overflow-x: auto; }
.markdown-rendered :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.markdown-rendered :deep(th), .markdown-rendered :deep(td) { padding: 8px 12px; border: 1px solid #eee; text-align: left; }
.markdown-rendered :deep(th) { background: #f9f9f9; font-weight: 600; }
.markdown-rendered :deep(strong) { font-weight: 600; }
.markdown-rendered :deep(a) { color: #1068bf; text-decoration: none; }
.markdown-rendered :deep(a:hover) { text-decoration: underline; }

.source-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.source-image {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.source-image img {
  max-width: 100%;
  border-radius: 4px;
  border: 1px solid #eee;
}

.image-name {
  font-size: 0.8em;
  color: #666;
}

.empty {
  color: #999;
  text-align: center;
  padding: 40px;
}
</style>
