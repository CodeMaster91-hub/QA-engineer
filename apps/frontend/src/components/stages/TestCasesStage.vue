<template>
  <div class="split-container" ref="containerRef">
    <!-- Left panel: Cases list -->
    <div class="split-panel cases-panel" :style="{ width: leftWidth + 'px' }">
      <div class="panel-header">
        <h3>Тест-кейсы ({{ cases.length }})</h3>
      </div>
      <div class="panel-body">
        <div v-if="cases.length" class="cases-scroll">
          <div
            v-for="(tc, idx) in cases"
            :key="tc.id"
            :class="['case-row', { selected: selectedIndex === idx }]"
            @click="selectCase(idx)"
          >
            <span class="tc-id">{{ tc.id }}</span>
            <span class="tc-title">{{ tc.title }}</span>
            <span class="tc-steps">{{ tc.steps?.length || 0 }} steps</span>
            <span :class="['badge', `badge-${tc.status}`]">{{ tc.status }}</span>
          </div>
        </div>
        <div v-else class="empty">Нет тест-кейсов</div>
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

    <!-- Right panel: Editor -->
    <div class="split-panel editor-panel" :style="{ width: rightWidth + 'px' }">
      <template v-if="selectedCase">
        <div class="panel-header">
          <h3>Редактирование кейса</h3>
        </div>
        <div class="panel-body editor-body">
          <!-- Title -->
          <div class="field">
            <label>Title</label>
            <input
              type="text"
              :value="selectedCase.title"
              @input="updateField('title', ($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- Priority + Type -->
          <div class="field-row">
            <div class="field">
              <label>Priority</label>
              <select
                :value="selectedCase.priority"
                @change="updateField('priority', ($event.target as HTMLSelectElement).value)"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="field">
              <label>Type</label>
              <select
                :value="selectedCase.type"
                @change="updateField('type', ($event.target as HTMLSelectElement).value)"
              >
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="validation">Validation</option>
                <option value="boundary">Boundary</option>
                <option value="permission">Permission</option>
                <option value="integration">Integration</option>
                <option value="regression">Regression</option>
                <option value="smoke">Smoke</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <!-- Status -->
          <div class="field-row">
            <div class="field">
              <label>Status</label>
              <select
                :value="selectedCase.status"
                @change="updateField('status', ($event.target as HTMLSelectElement).value)"
              >
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
                <option value="needs_clarification">Needs Clarification</option>
              </select>
            </div>
            <div class="field">
              <label>Automation</label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="selectedCase.automation_candidate"
                  @change="updateField('automation_candidate', ($event.target as HTMLInputElement).checked)"
                />
                Candidate
              </label>
            </div>
          </div>

          <!-- Preconditions -->
          <div class="field">
            <label>Preconditions</label>
            <textarea
              :value="selectedCase.preconditions"
              @input="updateField('preconditions', ($event.target as HTMLTextAreaElement).value)"
              rows="2"
            ></textarea>
          </div>

          <!-- Final Expected Result -->
          <div class="field">
            <label>Final Expected Result</label>
            <textarea
              :value="selectedCase.final_expected_result"
              @input="updateField('final_expected_result', ($event.target as HTMLTextAreaElement).value)"
              rows="2"
            ></textarea>
          </div>

          <!-- Steps -->
          <div class="field">
            <div class="field-header">
              <label>Steps</label>
              <button class="btn-add" @click="addStep">+ Добавить шаг</button>
            </div>
            <div v-if="selectedCase.steps.length" class="steps-list">
              <TransitionGroup name="step">
                <div v-for="(step, sIdx) in selectedCase.steps" :key="step._uid" class="step-item">
                  <span class="step-num">{{ sIdx + 1 }}.</span>
                  <div class="step-fields">
                    <input
                      type="text"
                      :value="step.action"
                      placeholder="Действие"
                      @input="updateStepField(sIdx, 'action', ($event.target as HTMLInputElement).value)"
                    />
                    <input
                      type="text"
                      :value="step.expected"
                      placeholder="Ожидание"
                      @input="updateStepField(sIdx, 'expected', ($event.target as HTMLInputElement).value)"
                    />
                  </div>
                  <div class="step-actions">
                    <button
                      class="btn-icon"
                      :disabled="sIdx === 0"
                      @click="moveStepUp(sIdx)"
                      title="Вверх"
                    >↑</button>
                    <button
                      class="btn-icon"
                      :disabled="sIdx === selectedCase.steps.length - 1"
                      @click="moveStepDown(sIdx)"
                      title="Вниз"
                    >↓</button>
                    <button
                      class="btn-icon btn-icon-danger"
                      @click="removeStep(sIdx)"
                      title="Удалить"
                    >✕</button>
                  </div>
                </div>
              </TransitionGroup>
            </div>
            <div v-else class="empty-steps">Нет шагов</div>
          </div>

          <!-- Requirements -->
          <div class="field">
            <label>Requirements</label>
            <div class="tags-container">
              <span v-for="(req, rIdx) in selectedCase.requirement_ids" :key="rIdx" class="tag">
                {{ req }}
                <button class="tag-remove" @click="removeRequirement(rIdx)">✕</button>
              </span>
              <input
                type="text"
                class="tag-input"
                placeholder="REQ-001"
                @keydown.enter.prevent="addReq(($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).value = ''"
              />
            </div>
          </div>

          <!-- Tags -->
          <div class="field">
            <label>Tags</label>
            <div class="tags-container">
              <span v-for="(tag, tIdx) in selectedCase.tags" :key="tIdx" class="tag">
                {{ tag }}
                <button class="tag-remove" @click="removeTag(tIdx)">✕</button>
              </span>
              <input
                type="text"
                class="tag-input"
                placeholder="tag"
                @keydown.enter.prevent="addTag(($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).value = ''"
              />
            </div>
          </div>

          <!-- Test Data -->
          <div class="field">
            <label>Test Data</label>
            <div class="tags-container">
              <span v-for="(td, dIdx) in selectedCase.test_data" :key="dIdx" class="tag">
                {{ td }}
                <button class="tag-remove" @click="removeTestData(dIdx)">✕</button>
              </span>
              <input
                type="text"
                class="tag-input"
                placeholder="data value"
                @keydown.enter.prevent="addTestData(($event.target as HTMLInputElement).value); ($event.target as HTMLInputElement).value = ''"
              />
            </div>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="editor-footer">
          <button class="btn btn-save" :disabled="!isDirty || saving" @click="onSave">
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button class="btn btn-delete" @click="onDelete">Удалить</button>
        </div>
      </template>

      <template v-else>
        <div class="panel-header">
          <h3>Редактирование кейса</h3>
        </div>
        <div class="panel-body empty-editor">
          Выберите тест-кейс для редактирования
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { Artifact } from '@/api/types';
import { useTestCases } from '@/composables/useTestCases';

const props = defineProps<{
  artifact: Artifact | null;
  slug: string;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const {
  cases,
  selectedIndex,
  selectedCase,
  isDirty,
  saving,
  syncFromArtifact,
  selectCase,
  updateField,
  addStep,
  removeStep,
  moveStepUp,
  moveStepDown,
  updateStepField,
  addTag,
  removeTag,
  addRequirement,
  removeRequirement,
  addTestData,
  removeTestData,
  deleteCase,
  save,
} = useTestCases(props.artifact);

watch(
  () => props.artifact,
  (art) => syncFromArtifact(art),
);

async function onSave() {
  await save(props.slug);
  emit('saved');
}

function onDelete() {
  deleteCase();
}

function addReq(value: string) {
  addRequirement(value);
}

// Split panel resize
const containerRef = ref<HTMLElement | null>(null);
const leftWidth = ref(400);
const rightWidth = ref(400);
const isDragging = ref(false);
const MIN_PANEL_WIDTH = 250;

const recalcPanels = () => {
  if (!containerRef.value) return;
  const w = containerRef.value.clientWidth;
  const total = w - 8;
  if (leftWidth.value + rightWidth.value !== total) {
    const ratio = leftWidth.value / (leftWidth.value + rightWidth.value || 1);
    leftWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(total - MIN_PANEL_WIDTH, Math.round(total * ratio)));
    rightWidth.value = total - leftWidth.value;
  }
};

const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
};

const onDrag = (e: MouseEvent) => {
  if (!containerRef.value) return;
  const containerRect = containerRef.value.getBoundingClientRect();
  const x = e.clientX - containerRect.left;
  const newLeft = Math.max(MIN_PANEL_WIDTH, Math.min(x, containerRect.width - MIN_PANEL_WIDTH - 8));
  leftWidth.value = newLeft;
  rightWidth.value = containerRect.width - newLeft - 8;
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    const w = containerRef.value.clientWidth;
    leftWidth.value = w / 2;
    rightWidth.value = w / 2 - 8;
  }
  resizeObserver = new ResizeObserver(recalcPanels);
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
.split-container {
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
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

.panel-header {
  padding: 13px 20px 10px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
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
  min-height: 0;
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

/* Left panel — cases list */
.cases-scroll {
  flex: 1;
  overflow-y: auto;
}

.case-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.case-row:hover {
  background: #f7f8fa;
}

.case-row.selected {
  background: #e8f0fe;
  border-left: 3px solid #1a73e8;
}

.tc-id {
  font-family: monospace;
  font-weight: 600;
  color: #1068bf;
  min-width: 60px;
}

.tc-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9em;
}

.tc-steps {
  font-size: 0.8em;
  color: #888;
  white-space: nowrap;
}

/* Right panel — editor */
.editor-body {
  padding: 16px 20px;
}

.editor-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* Fields */
.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 0.85em;
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}

.field input[type="text"],
.field textarea,
.field select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: inherit;
  box-sizing: border-box;
}

.field input[type="text"]:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.15);
}

.field-row {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.field-row .field {
  flex: 1;
  margin-bottom: 0;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 6px;
  font-weight: 400 !important;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

/* Steps */
.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.field-header label {
  margin-bottom: 0;
}

.btn-add {
  padding: 4px 10px;
  font-size: 0.8em;
  background: #e8f0fe;
  color: #1a73e8;
  border: 1px solid #c2d7f5;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-add:hover {
  background: #d2e3fc;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fafbfc;
  border: 1px solid #eee;
  border-radius: 4px;
}

.step-num {
  font-weight: 600;
  color: #888;
  min-width: 24px;
  text-align: center;
}

.step-fields {
  flex: 1;
  display: flex;
  gap: 8px;
}

.step-fields input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 0.85em;
}

.step-fields input:focus {
  outline: none;
  border-color: #1a73e8;
}

.step-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 3px;
  font-size: 0.85em;
  transition: background 0.15s;
}

.btn-icon:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: default;
}

.btn-icon-danger:hover:not(:disabled) {
  background: #ffebee;
  color: #c62828;
}

.empty-steps {
  color: #aaa;
  font-size: 0.85em;
  padding: 8px 0;
}

/* Tags / Requirements / Test Data */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 34px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 3px;
  font-size: 0.8em;
  font-family: monospace;
}

.tag-remove {
  border: none;
  background: transparent;
  color: #999;
  cursor: pointer;
  font-size: 0.9em;
  padding: 0 2px;
}

.tag-remove:hover {
  color: #c62828;
}

.tag-input {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  padding: 2px 4px !important;
  font-size: 0.85em;
  min-width: 80px;
  flex: 1;
}

/* Buttons */
.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save {
  background: #1a73e8;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #1557b0;
}

.btn-save:disabled {
  background: #ccc;
  cursor: default;
}

.btn-delete {
  background: #fff;
  color: #c62828;
  border: 1px solid #e0e0e0;
  margin-left: auto;
}

.btn-delete:hover {
  background: #ffebee;
  border-color: #c62828;
}

/* Empty state */
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.95em;
}

/* Badge */
.badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge-draft { background: #f5f5f5; color: #666; }
.badge-reviewed { background: #e3f2fd; color: #1565c0; }
.badge-approved { background: #e8f5e9; color: #2da160; }
.badge-needs_clarification { background: #fff3e0; color: #ef6c00; }

/* Step reorder animation */
.step-move,
.step-enter-active,
.step-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.step-leave-active {
  position: absolute;
  width: 100%;
}
</style>
