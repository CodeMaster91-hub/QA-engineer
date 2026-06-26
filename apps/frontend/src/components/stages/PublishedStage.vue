<template>
  <div class="stage-panel">
    <h3>Публикация</h3>

    <div class="publish-status">
      <div class="status-icon">✓</div>
      <div class="status-text">
        <p>Pipeline завершён успешно.</p>
        <p class="status-hint">Кейсы готовы к публикации в TestRail.</p>
      </div>
    </div>

    <div v-if="showPublish" class="publish-actions">
      <button class="btn btn-publish" @click="$emit('publish')">
        📤 Опубликовать в TestRail
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showPublish: boolean
}>()

defineEmits<{
  publish: []
}>()
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
  width: 100%;
}

.stage-panel h3 {
  margin: 0 0 16px 0;
  color: #1a1a2e;
  font-size: 1.1em;
}

.publish-status {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px;
  background: #e8f5e9;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status-icon {
  width: 48px;
  height: 48px;
  background: #2da160;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  font-weight: bold;
  flex-shrink: 0;
}

.status-text p {
  margin: 0;
  color: #1b5e20;
}

.status-hint {
  font-size: 0.9em;
  color: #2e7d32;
  margin-top: 4px !important;
}

.publish-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-publish {
  background: #2da160;
  color: white;
}

.btn-publish:hover {
  background: #258a51;
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
</style>
