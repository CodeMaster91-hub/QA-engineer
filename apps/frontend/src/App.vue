<template>
  <div id="app">
    <nav class="navbar">
      <div class="navbar-brand">
        <router-link to="/" class="navbar-item logo">
          <img src="/qa-icon.svg" alt="QA Platform" class="logo-icon" />
          QA Platform
        </router-link>
      </div>
      <div class="navbar-menu">
        <router-link to="/features" class="navbar-item">Features</router-link>
        <router-link to="/settings" class="navbar-item">Settings</router-link>
      </div>
    </nav>
    <main class="container">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
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
}

#app {
  min-height: 100vh;
}

.navbar {
  background: #1a1a2e;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
  height: 60px;
}

.navbar-brand {
  margin-right: 40px;
}

.navbar-item {
  color: #ccc;
  text-decoration: none;
  padding: 20px;
  transition: color 0.2s;
  position: relative;
}

.navbar-item:hover {
  color: white;
}

.navbar-item.router-link-active {
  color: white;
}

.navbar-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 20px;
  height: 3px;
  background: #4fc3f7;
  border-radius: 2px 2px 0 0;
}

.logo {
  font-weight: bold;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 28px;
  height: 28px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
