<template>
  <div class="split-container" ref="containerRef">
    <!-- Left panel: Source -->
    <div class="split-panel source-panel" :style="{ width: leftWidth + 'px' }">
      <div class="panel-header">
        <h3>Источник</h3>
      </div>
      <div class="panel-body">
        <div v-if="text || images.length" class="source-content">
          <div class="markdown-rendered" v-html="renderedText"></div>
          <div v-if="images.length" class="source-images">
            <div v-for="(img, idx) in images" :key="idx" class="source-image">
              <img :src="img.data" :alt="img.name || `Image ${idx + 1}`" />
              <span v-if="img.name" class="image-name">{{ img.name }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">Нет данных источника</div>
      </div>
    </div>

    <!-- Draggable divider -->
    <div
      class="split-divider"
      :class="{ dragging: isDragging }"
      @mousedown="startDrag"
    >
      <div class="divider-handle">⋮⋮</div>
    </div>

    <!-- Right panel: Requirements -->
    <div class="split-panel requirements-panel" :style="{ width: rightWidth + 'px' }">
      <div class="panel-header">
        <h3>Требования</h3>
      </div>
      <div class="panel-body">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Artifact, PipelineQuestion } from '@/api/types'
import QuestionsPanel from '@/components/QuestionsPanel.vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  sourceArtifact: Artifact | null
  artifact: Artifact | null
  questions: PipelineQuestion[]
}>()

defineEmits<{
  answer: []
}>()

const requirements = computed(() => props.artifact?.content?.requirements || [])
const text = computed(() => props.sourceArtifact?.content?.text || '')
const images = computed(() => props.sourceArtifact?.content?.images || [])
const renderedText = computed(() => renderMarkdown(text.value))

const containerRef = ref<HTMLElement | null>(null)
const leftWidth = ref(400)
const rightWidth = ref(400)
const isDragging = ref(false)
const MIN_PANEL_WIDTH = 250

const startDrag = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onDrag = (e: MouseEvent) => {
  if (!containerRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - containerRect.left
  const newLeft = Math.max(MIN_PANEL_WIDTH, Math.min(x, containerRect.width - MIN_PANEL_WIDTH - 8))
  leftWidth.value = newLeft
  rightWidth.value = containerRect.width - newLeft - 8
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  if (containerRef.value) {
    const w = containerRef.value.clientWidth
    leftWidth.value = w / 2
    rightWidth.value = w / 2 - 8
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.split-container {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 400px;
  width: 100%;
}

.split-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #eee;
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
}

/* Divider */
.split-divider {
  width: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  position: relative;
  transition: background 0.15s;
}

.split-divider:hover,
.split-divider.dragging {
  background: rgba(16, 104, 191, 0.1);
}

.divider-handle {
  color: #ccc;
  font-size: 10px;
  line-height: 1;
  transition: color 0.15s;
  pointer-events: none;
}

.split-divider:hover .divider-handle,
.split-divider.dragging .divider-handle {
  color: #1068bf;
}

/* Source content */
.source-content {
  font-size: 0.9em;
  line-height: 1.6;
}

.markdown-rendered :deep(h1) { font-size: 1.3em; margin: 14px 0 6px; }
.markdown-rendered :deep(h2) { font-size: 1.15em; margin: 12px 0 6px; }
.markdown-rendered :deep(h3) { font-size: 1.05em; margin: 10px 0 4px; }
.markdown-rendered :deep(p) { margin: 6px 0; }
.markdown-rendered :deep(ul) { margin: 6px 0; padding-left: 20px; }
.markdown-rendered :deep(li) { margin: 3px 0; }
.markdown-rendered :deep(code) { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
.markdown-rendered :deep(pre) { background: #1e1e1e; color: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; }
.markdown-rendered :deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
.markdown-rendered :deep(th), .markdown-rendered :deep(td) { padding: 6px 10px; border: 1px solid #eee; text-align: left; }
.markdown-rendered :deep(th) { background: #f9f9f9; font-weight: 600; }
.markdown-rendered :deep(strong) { font-weight: 600; }
.markdown-rendered :deep(a) { color: #1068bf; text-decoration: none; }
.markdown-rendered :deep(a:hover) { text-decoration: underline; }

.source-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
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

/* Requirements table */
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
