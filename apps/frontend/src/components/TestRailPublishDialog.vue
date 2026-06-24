<template>
  <div class="testrail-publish-dialog">
    <div class="dialog-overlay" @click="$emit('close')"></div>
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>Публикация в TestRail</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>Проект:</label>
          <select v-model="selectedProjectId" @change="onProjectChange">
            <option :value="null">Выберите проект</option>
            <option
              v-for="project in projects"
              :key="project.id"
              :value="project.id"
            >
              {{ project.name }}
            </option>
          </select>
        </div>

        <div class="form-group" v-if="selectedProjectId">
          <label>Suite:</label>
          <select v-model="selectedSuiteId" @change="onSuiteChange">
            <option :value="null">Выберите suite</option>
            <option v-for="suite in suites" :key="suite.id" :value="suite.id">
              {{ suite.name }}
            </option>
          </select>
        </div>

        <div class="form-group" v-if="selectedSuiteId">
          <label>Секции:</label>
          <div class="sections-list">
            <div
              v-for="section in sections"
              :key="section.id"
              class="section-item"
              :class="{ selected: selectedSectionId === section.id }"
              @click="selectedSectionId = section.id"
            >
              <input
                type="radio"
                :checked="selectedSectionId === section.id"
                @change="selectedSectionId = section.id"
              />
              {{ section.name }}
            </div>
          </div>

          <button class="btn-add-section" @click="showNewSection = !showNewSection">
            + Создать новую секцию
          </button>

          <div v-if="showNewSection" class="new-section-form">
            <input
              v-model="newSectionName"
              placeholder="Название секции"
              class="input"
            />
            <input
              v-model="newSectionDescription"
              placeholder="Описание (опционально)"
              class="input"
            />
            <button
              class="btn-create"
              @click="createSection"
              :disabled="!newSectionName"
            >
              Создать
            </button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn-cancel" @click="$emit('close')">Отмена</button>
        <button
          class="btn-publish"
          @click="publish"
          :disabled="!canPublish || isPublishing"
        >
          {{ isPublishing ? 'Публикация...' : 'Опубликовать' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/api/client';

interface Project {
  id: number;
  name: string;
}

interface Suite {
  id: number;
  name: string;
  project_id: number;
}

interface Section {
  id: number;
  name: string;
  suite_id: number;
  description?: string;
}

const props = defineProps<{
  featureSlug: string;
}>();

const emit = defineEmits<{
  close: [];
  published: [jobId: string];
}>();

const projects = ref<Project[]>([]);
const suites = ref<Suite[]>([]);
const sections = ref<Section[]>([]);

const selectedProjectId = ref<number | null>(null);
const selectedSuiteId = ref<number | null>(null);
const selectedSectionId = ref<number | null>(null);

const showNewSection = ref(false);
const newSectionName = ref('');
const newSectionDescription = ref('');

const isPublishing = ref(false);

const canPublish = computed(() => {
  return selectedProjectId.value && selectedSuiteId.value && selectedSectionId.value;
});

onMounted(async () => {
  await loadSettings();
  await loadProjects();
});

async function loadSettings() {
  try {
    const settings = await api.get('/users/settings');
    if (settings.testrail_project_id) {
      selectedProjectId.value = settings.testrail_project_id;
    }
    if (settings.testrail_suite_id) {
      selectedSuiteId.value = settings.testrail_suite_id;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function loadProjects() {
  try {
    projects.value = await api.get('/testrail/projects');
    if (selectedProjectId.value) {
      await loadSuites();
    }
  } catch (e) {
    console.error('Failed to load projects:', e);
  }
}

async function loadSuites() {
  if (!selectedProjectId.value) return;
  try {
    suites.value = await api.get(
      `/testrail/projects/${selectedProjectId.value}/suites`
    );
    if (selectedSuiteId.value) {
      await loadSections();
    }
  } catch (e) {
    console.error('Failed to load suites:', e);
  }
}

async function loadSections() {
  if (!selectedProjectId.value || !selectedSuiteId.value) return;
  try {
    sections.value = await api.get(
      `/testrail/projects/${selectedProjectId.value}/suites/${selectedSuiteId.value}/sections`
    );
  } catch (e) {
    console.error('Failed to load sections:', e);
  }
}

async function onProjectChange() {
  selectedSuiteId.value = null;
  selectedSectionId.value = null;
  suites.value = [];
  sections.value = [];
  await saveSettings({ testrail_project_id: selectedProjectId.value });
  await loadSuites();
}

async function onSuiteChange() {
  selectedSectionId.value = null;
  await saveSettings({ testrail_suite_id: selectedSuiteId.value });
  await loadSections();
}

async function saveSettings(settings: Record<string, any>) {
  try {
    await api.patch('/users/settings', settings);
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

async function createSection() {
  if (!selectedProjectId.value || !selectedSuiteId.value || !newSectionName.value) {
    return;
  }

  try {
    const section = await api.post(
      `/testrail/projects/${selectedProjectId.value}/suites/${selectedSuiteId.value}/sections`,
      {
        name: newSectionName.value,
        description: newSectionDescription.value,
      }
    );

    sections.value.push(section);
    selectedSectionId.value = section.id;
    showNewSection.value = false;
    newSectionName.value = '';
    newSectionDescription.value = '';
  } catch (e) {
    console.error('Failed to create section:', e);
  }
}

async function publish() {
  if (!canPublish.value) return;

  isPublishing.value = true;
  try {
    const result = await api.post(`/testrail/${props.featureSlug}/publish`, {
      projectId: selectedProjectId.value,
      suiteId: selectedSuiteId.value,
      sectionId: selectedSectionId.value,
    });

    emit('published', result.jobId);
  } catch (e) {
    console.error('Failed to publish:', e);
  } finally {
    isPublishing.value = false;
  }
}
</script>

<style scoped>
.testrail-publish-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.dialog-content {
  position: relative;
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.dialog-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.dialog-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sections-list {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.section-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.section-item:last-child {
  border-bottom: none;
}

.section-item:hover {
  background: #f5f5f5;
}

.section-item.selected {
  background: #e3f2fd;
}

.btn-add-section {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border: 1px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.btn-add-section:hover {
  background: #eee;
}

.new-section-form {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.new-section-form .input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
}

.btn-create {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-create:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.btn-cancel {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-publish {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-publish:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
