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
        <div class="split-container" ref="containerRef">
          <div class="split-panel cases-panel" :style="{ width: leftWidth + 'px' }">
            <div class="panel-header">
              <h3>Тест-кейсы
                <template v-if="selectedSectionId">
                  <span class="filter-badge" @click.stop="selectedSectionId = null; selectedSectionName = ''">
                    {{ selectedSectionName }} <span class="filter-clear">✕</span>
                  </span>
                </template>
                <span class="case-count">({{ filteredCases.length }})</span>
              </h3>
            </div>
            <div class="panel-body">
              <div v-if="filteredCases.length === 0 && selectedSectionId" class="empty-filter">
                Нет кейсов в секции «{{ selectedSectionName }}»
              </div>
              <div v-else class="cases-table">
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
                    <tr v-for="tc in filteredCases" :key="tc.id">
                      <td class="tc-id">{{ tc.id }}</td>
                      <td>{{ tc.title }}</td>
                      <td>
                        <template v-if="tc.targetSectionId">
                          <span v-if="tc.targetSectionId.startsWith('__new__/')" class="section-new">
                            [Новая] {{ getSectionName(tc.targetSectionId) }}
                          </span>
                          <span v-else class="section-existing">
                            {{ getSectionName(tc.targetSectionId) }}
                          </span>
                        </template>
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
          </div>

          <div
            class="split-divider"
            :class="{ dragging: isDragging }"
            @mousedown="startDrag"
          >
            <div class="divider-handle">⋮⋮</div>
          </div>

          <div class="split-panel sections-panel" :style="{ width: rightWidth + 'px' }">
            <div class="panel-header">
              <h3>Секции TestRail</h3>
            </div>
            <div class="panel-body">
              <div v-if="visibleTree.length" class="section-group">
                  <div
                    v-for="item in visibleTree"
                    :key="item.id"
                    class="tree-node"
                    :class="{ 'tree-node-selected': selectedSectionId === item.id }"
                    @click="toggleNode(item.id)"
                  >
                  <span class="tree-guides">{{ item.guides }}</span>
                  <span class="tree-toggle" v-if="item.hasChildren">
                    {{ expandedState[item.id] === false ? '▶' : '▼' }}
                  </span>
                  <span class="folder-icon" v-else>📂</span>
                  <span :class="{ 'section-new-label': item.isNew }">
                    {{ item.isNew ? '[Новая] ' + item.name : item.name }}
                  </span>
                  <span class="section-count">{{ item.caseCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="error" class="pipeline-error">{{ error }}</div>
      <div v-else class="empty">Dry run не выполнялся</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { Artifact, DryRunArtifact } from '@/api/types'

const props = defineProps<{
  artifact: Artifact | null
  error?: string
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

const allSections = computed(() => [...existingSections.value, ...newSections.value])

const getSectionName = (sectionId: string): string => {
  return allSections.value.find((s) => s.id === sectionId)?.name || `#${sectionId}`
}

const getCasesForSection = (sectionId: string) => {
  return cases.value.filter((c) => c.targetSectionId === sectionId)
}

const childMap = computed(() => {
  const existing = existingSections.value.map((s) => ({ ...s, isNew: false as const }))
  const news = newSections.value.map((s) => ({ ...s, isNew: true as const }))
  const all = [...existing, ...news]
  const map = new Map<string, typeof all[0][]>()
  for (const sec of all) {
    const key = sec.parentId || '__root__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(sec)
  }
  return map
})

const allDescendantIds = (sectionId: string): string[] => {
  const ids: string[] = [sectionId]
  const children = childMap.value.get(sectionId) || []
  for (const child of children) {
    ids.push(...allDescendantIds(child.id))
  }
  return ids
}

const filteredCases = computed(() => {
  if (!selectedSectionId.value) return cases.value
  const ids = allDescendantIds(selectedSectionId.value)
  return cases.value.filter((c) => c.targetSectionId && ids.includes(c.targetSectionId))
})

const expandedState = ref<Record<string, boolean>>({})
const selectedSectionId = ref<string | null>(null)
const selectedSectionName = ref<string>('')

const toggleNode = (id: string) => {
  if (selectedSectionId.value === id) {
    selectedSectionId.value = null
    selectedSectionName.value = ''
  } else {
    selectedSectionId.value = id
    selectedSectionName.value = getSectionName(id)
  }
  const sec = allSections.value.find((s) => s.id === id)
  if (sec) {
    const children = childMap.value.get(id)
    if (children && children.length > 0) {
      const prev = expandedState.value[id]
      expandedState.value = { ...expandedState.value, [id]: prev === false ? true : false }
    }
  }
}

const visibleTree = computed(() => {
  const existing = existingSections.value.map((s) => ({ ...s, isNew: false as const }))
  const news = newSections.value.map((s) => ({ ...s, isNew: true as const }))
  const all = [...existing, ...news]
  if (!all.length) return []

  const cm = childMap.value
  const hasChildren = (id: string) => cm.has(id) && cm.get(id)!.length > 0
  const isExpanded = (id: string) => expandedState.value[id] !== false

  type TreeNode = {
    id: string; name: string; depth: number; caseCount: number
    isNew: boolean; hasChildren: boolean; guides: string
  }
  const result: TreeNode[] = []
  const stack: boolean[] = []

  const walk = (parentKey: string, depth: number) => {
    const children = cm.get(parentKey) || []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const isLast = i === children.length - 1
      const hc = hasChildren(child.id)
      const exp = isExpanded(child.id)

      let guides = ''
      for (let d = 0; d < depth; d++) {
        guides += stack[d] ? '   ' : '│  '
      }
      guides += isLast ? '└──' : '├──'

      result.push({
        id: child.id,
        name: child.name,
        depth,
        caseCount: getCasesForSection(child.id).length,
        isNew: child.isNew,
        hasChildren: hc,
        guides,
      })

      if (hc && exp) {
        stack.push(isLast)
        walk(child.id, depth + 1)
        stack.pop()
      }
    }
  }
  walk('__root__', 0)
  return result
})

const containerRef = ref<HTMLElement | null>(null)
const leftWidth = ref(400)
const rightWidth = ref(400)
const isDragging = ref(false)
const MIN_PANEL_WIDTH = 250

const recalcPanels = () => {
  if (!containerRef.value) return
  const w = containerRef.value.clientWidth
  const total = w - 8
  if (leftWidth.value + rightWidth.value !== total) {
    const ratio = leftWidth.value / (leftWidth.value + rightWidth.value || 1)
    leftWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(total - MIN_PANEL_WIDTH, Math.round(total * ratio)))
    rightWidth.value = total - leftWidth.value
  }
}

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

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    const w = containerRef.value.clientWidth
    leftWidth.value = Math.round(w * 0.65)
    rightWidth.value = w - leftWidth.value - 8
  }
  resizeObserver = new ResizeObserver(recalcPanels)
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
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

.stage-panel > .panel-header {
  padding: 5px 20px 3px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.stage-panel > .panel-header h3 {
  margin: 0 0 3px 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

.stage-panel > .panel-body {
  padding: 0 20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-card {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 8px;
  text-align: center;
  height: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-value {
  font-size: 1.35em;
  font-weight: 700;
  color: #1068bf;
}

.stat-label {
  font-size: 0.68em;
  color: #666;
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
  align-items: stretch;
  gap: 0;
  min-height: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.split-panel {
  min-height: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-panel > .panel-header {
  padding: 13px 20px 10px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.split-panel > .panel-header h3 {
  margin: 0;
  color: #1a1a2e;
  font-size: 1.1em;
  display: flex;
  align-items: center;
}

.split-panel > .panel-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

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
  white-space: nowrap;
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

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  font-size: 0.9em;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.12s;
  user-select: none;
}

.tree-node:hover {
  background: #f4f6f9;
}

.tree-guides {
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  line-height: 1;
  color: #c0c4cc;
  white-space: pre;
  flex-shrink: 0;
  user-select: none;
}

.tree-toggle {
  flex-shrink: 0;
  font-size: 0.7em;
  color: #888;
  width: 16px;
  text-align: center;
  transition: color 0.15s;
  line-height: 1;
}

.tree-node:hover .tree-toggle {
  color: #1068bf;
}

.folder-icon {
  flex-shrink: 0;
  font-size: 0.85em;
  line-height: 1;
  width: 16px;
  text-align: center;
}

.section-new-label {
  color: #1565c0;
  font-style: italic;
}

.section-count {
  margin-left: auto;
  background: #f0f0f0;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 0.78em;
  color: #666;
  flex-shrink: 0;
}

.tree-node-selected {
  background: #e8f0fe;
  outline: 1px solid #1068bf44;
}

.tree-node-selected:hover {
  background: #dce8fa;
}

.empty-filter {
  color: #999;
  text-align: center;
  padding: 40px 20px;
  font-size: 0.9em;
}

.case-count {
  font-weight: 400;
  color: #666;
  font-size: 0.85em;
  margin-left: 4px;
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e8f0fe;
  color: #1068bf;
  font-weight: 500;
  font-size: 0.8em;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
  transition: background 0.12s;
  vertical-align: middle;
}

.filter-badge:hover {
  background: #d0e2fc;
}

.filter-clear {
  font-size: 0.85em;
  font-weight: 700;
  line-height: 1;
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
</style>
