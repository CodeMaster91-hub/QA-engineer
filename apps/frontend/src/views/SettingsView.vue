<template>
  <div class="settings">
    <h1>Settings</h1>
    
    <div class="section">
      <h2>Agent Config</h2>
      <div v-if="configs.length" class="config-list">
        <div v-for="config in configs" :key="config.stage" class="config-card">
          <div class="config-header">
            <h3>{{ config.stage }}</h3>
            <label class="toggle">
              <input type="checkbox" v-model="config.enabled" @change="saveConfig(config)" />
              <span class="slider"></span>
            </label>
          </div>
          <div class="config-body">
            <div class="form-group">
              <label>Alias</label>
              <input v-model="config.alias" type="text" @change="saveConfig(config)" />
            </div>
            <div class="form-group">
              <label>Temperature</label>
              <input v-model.number="config.temperature" type="number" step="0.1" min="0" max="1" @change="saveConfig(config)" />
            </div>
            <div class="form-group">
              <label>Max Tokens</label>
              <input v-model.number="config.maxTokens" type="number" step="256" @change="saveConfig(config)" />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="loading">Загрузка...</div>
    </div>
    
    <div class="section">
      <h2>Интерфейс</h2>
      <div class="settings-card">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Показывать логи</span>
            <span class="setting-hint">Отображать секцию логов на странице фичи</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="showLogs" @change="saveSetting('show_logs', showLogs)" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Интервал опроса статуса</span>
            <span class="setting-hint">Частота обновления статуса пайплайна через HTTP (сек)</span>
          </div>
          <input
            type="number"
            :value="pollInterval"
            min="5"
            max="120"
            class="setting-input"
            @change="saveSetting('poll_interval', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <div class="section">
      <h2>TMS Provider</h2>
      <div class="provider-info">
        <p>Текущий провайдер: <strong>{{ tmsProvider }}</strong></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api/client'

const configs = ref<any[]>([])
const tmsProvider = ref('testrail')
const showLogs = ref(localStorage.getItem('show_logs') !== 'false')
const pollInterval = ref(localStorage.getItem('poll_interval') || '15')

const loadConfigs = async () => {
  try {
    const response = await api.get<any>('/agents/config')
    configs.value = response.data
  } catch (e) {
    console.error('Failed to load configs:', e)
  }
}

const saveConfig = async (config: any) => {
  try {
    await api.patch(`/agents/config/${config.stage}`, config)
  } catch (e) {
    console.error('Failed to save config:', e)
  }
}

const saveSetting = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value))
}

onMounted(loadConfigs)
</script>

<style scoped>
.settings {
  padding: 20px 0;
}

h1 {
  color: #1a1a2e;
  margin-bottom: 24px;
}

.section {
  margin-bottom: 32px;
}

.section h2 {
  margin-bottom: 16px;
  color: #333;
}

.config-list {
  display: grid;
  gap: 16px;
}

.config-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.config-header h3 {
  color: #1a1a2e;
  text-transform: uppercase;
  font-size: 0.95em;
}

.config-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85em;
  color: #666;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  content: "";
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .slider {
  background: #1a1a2e;
}

.toggle input:checked + .slider:before {
  transform: translateX(24px);
}

.provider-info {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 0.95em;
  color: #1a1a2e;
}

.setting-hint {
  font-size: 0.8em;
  color: #999;
}

.setting-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
