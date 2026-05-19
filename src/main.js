import { createApp } from 'vue'
import './style.css'
import { injectInstanceTheme } from './theme-loader.js'
import { consumeAuthRedirectResult } from './firebase.js'
import App from './App.vue'
import router from './router/routing.js'

injectInstanceTheme()

async function bootstrap() {
  await consumeAuthRedirectResult()

  createApp(App)
    .use(router)
    .mount('#app')
}

bootstrap()
