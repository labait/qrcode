import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/routing.js'

createApp(App)
  .use(router)
  .mount('#app')
