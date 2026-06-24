<template>
  <div class="dynamic-form">
    <div class="form-group" v-for="field in visibleFields" :key="field.key">
      <label>{{ field.label }}:</label>
      
      <select
        v-if="field.type === 'select'"
        v-model="formData[field.key]"
        @change="onFieldChange(field.key)"
        :disabled="loading"
      >
        <option :value="null">Выберите {{ field.label.toLowerCase() }}</option>
        <option
          v-for="option in fieldOptions[field.key]"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <div v-else-if="field.type === 'tree'" class="tree-container">
        <div class="tree-view">
          <div
            v-for="node in fieldOptions[field.key]"
            :key="node.id"
            class="tree-node"
            :class="{ selected: formData[field.key] === node.id }"
            @click="selectTreeNode(field.key, node)"
          >
            <span class="tree-icon">📁</span>
            {{ node.name }}
          </div>
        </div>
      </div>

      <input
        v-else-if="field.type === 'input'"
        v-model="formData[field.key]"
        type="text"
        :placeholder="field.label"
        :disabled="loading"
      />

      <button
        v-if="field.allowCreate && field.type === 'select'"
        class="btn-create"
        @click="showCreateField = field.key"
        :disabled="loading"
      >
        + Создать
      </button>

      <div v-if="showCreateField === field.key" class="create-form">
        <input
          v-model="newItemName"
          placeholder="Название"
          class="input"
        />
        <button
          class="btn-confirm"
          @click="createNewItem(field)"
          :disabled="!newItemName"
        >
          Создать
        </button>
        <button
          class="btn-cancel"
          @click="showCreateField = null"
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '@/api/client';

interface TmsField {
  key: string;
  label: string;
  type: 'select' | 'tree' | 'input' | 'multiselect';
  required: boolean;
  dependsOn?: string;
  allowCreate?: boolean;
}

interface TmsSchema {
  provider: string;
  name: string;
  fields: TmsField[];
}

interface TmsNode {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  children?: TmsNode[];
}

const props = defineProps<{
  featureSlug: string;
}>();

const emit = defineEmits<{
  publish: [params: any];
}>();

const schema = ref<TmsSchema | null>(null);
const formData = ref<Record<string, any>>({});
const fieldOptions = ref<Record<string, any[]>>({});
const loading = ref(false);
const showCreateField = ref<string | null>(null);
const newItemName = ref('');

const visibleFields = computed(() => {
  if (!schema.value) return [];
  
  return schema.value.fields.filter((field) => {
    if (!field.dependsOn) return true;
    return formData.value[field.dependsOn] !== null;
  });
});

onMounted(async () => {
  await loadSchema();
  await loadSettings();
});

async function loadSchema() {
  try {
    schema.value = await api.get('/tms/schema');
    
    for (const field of schema.value!.fields) {
      if (!field.dependsOn) {
        await loadFieldOptions(field);
      }
    }
  } catch (e) {
    console.error('Failed to load TMS schema:', e);
  }
}

async function loadSettings() {
  try {
    const settings = await api.get('/users/settings');
    if (settings.tms_project_id) {
      formData.value.project_id = settings.tms_project_id;
      await loadFieldOptions(schema.value!.fields.find(f => f.key === 'project_id')!);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function loadFieldOptions(field: TmsField) {
  try {
    if (field.key === 'project_id') {
      const projects = await api.get('/tms/projects');
      fieldOptions.value[field.key] = projects.map(p => ({
        value: p.id,
        label: p.name,
      }));
    } else if (field.key.includes('_id') || field.key.includes('_plan_id')) {
      const endpoint = `/tms/tree/${formData.value[field.dependsOn!]}`;
      const nodes = await api.get(endpoint);
      fieldOptions.value[field.key] = field.type === 'tree'
        ? nodes
        : nodes.map(n => ({ value: n.id, label: n.name }));
    }
  } catch (e) {
    console.error(`Failed to load options for ${field.key}:`, e);
  }
}

async function onFieldChange(fieldKey: string) {
  await saveSettings({ [`tms_${fieldKey}`]: formData.value[fieldKey] });
  
  const dependentFields = schema.value!.fields.filter(f => f.dependsOn === fieldKey);
  for (const field of dependentFields) {
    formData.value[field.key] = null;
    fieldOptions.value[field.key] = [];
    await loadFieldOptions(field);
  }
}

function selectTreeNode(fieldKey: string, node: TmsNode) {
  formData.value[fieldKey] = node.id;
}

async function createNewItem(field: TmsField) {
  if (!newItemName.value) return;
  
  try {
    const result = await api.post('/tms/create-node', {
      type: field.key,
      parentId: formData.value[field.dependsOn!],
      name: newItemName.value,
    });
    
    fieldOptions.value[field.key].push({
      value: result.id,
      label: result.name,
    });
    
    formData.value[field.key] = result.id;
    showCreateField.value = null;
    newItemName.value = '';
  } catch (e) {
    console.error('Failed to create item:', e);
  }
}

async function saveSettings(settings: Record<string, any>) {
  try {
    await api.patch('/users/settings', settings);
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function getFormData() {
  return { ...formData.value };
}

defineExpose({ getFormData });
</script>

<style scoped>
.dynamic-form {
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

.tree-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.tree-node:last-child {
  border-bottom: none;
}

.tree-node:hover {
  background: #f5f5f5;
}

.tree-node.selected {
  background: #e3f2fd;
}

.btn-create {
  margin-top: 8px;
  padding: 8px;
  background: #f5f5f5;
  border: 1px dashed #ddd;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

.btn-create:hover {
  background: #eee;
}

.create-form {
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
  display: flex;
  gap: 8px;
}

.create-form .input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-confirm {
  padding: 8px 16px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-confirm:disabled {
  background: #ccc;
}

.btn-cancel {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}
</style>
