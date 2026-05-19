import { createApp } from 'vue'
import './style.css'
import { injectInstanceTheme } from './theme-loader.js'
import App from './App.vue'
import router from './router/routing.js'

injectInstanceTheme()

createApp(App)
  .use(router)
  .mount('#app')
