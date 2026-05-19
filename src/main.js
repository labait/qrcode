import { createApp } from 'vue'
import './style.css'
import { injectInstanceTheme } from './theme-loader.js'
import { ensureAuthReady } from './firebase.js'
import App from './App.vue'
import router from './router/routing.js'

injectInstanceTheme()

async function bootstrap() {
  await ensureAuthReady()

  createApp(App)
    .use(router)
    .mount('#app')
}

bootstrap()
