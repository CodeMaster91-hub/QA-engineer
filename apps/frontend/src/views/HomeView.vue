<template>
  <div class="home">
    <h1>QA Platform</h1>
    <p class="subtitle">Автоматизированное тестирование требований</p>
    
    <div class="cards">
      <div class="card">
        <h3>Features</h3>
        <p>Управление фичами и артефактами</p>
        <router-link to="/features" class="btn">Перейти</router-link>
      </div>
      
      <div class="card">
        <h3>Pipeline</h3>
        <p>Оркестрация пайплайна генерации тест-кейсов</p>
        <router-link to="/pipeline" class="btn">Перейти</router-link>
      </div>
      
      <div class="card">
        <h3>Settings</h3>
        <p>Конфигурация AI-агентов и TMS</p>
        <router-link to="/settings" class="btn">Перейти</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  text-align: center;
  padding: 40px 20px;
}

h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  color: #1a1a2e;
}

.subtitle {
  color: #666;
  font-size: 1.2em;
  margin-bottom: 40px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.card h3 {
  margin-bottom: 10px;
  color: #1a1a2e;
}

.card p {
  color: #666;
  margin-bottom: 20px;
}

.btn {
  display: inline-block;
  background: #1a1a2e;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  transition: background 0.2s;
}

.btn:hover {
  background: #16213e;
}
</style>
