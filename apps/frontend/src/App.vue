<template>
  <div id="app">
    <Sidebar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  overflow: hidden;
}

#app {
  display: flex;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.main-content::-webkit-scrollbar {
  display: none;
}
</style>
