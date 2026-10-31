import {createApp} from 'vue';
import {createPinia} from 'pinia';
import App from './App.vue';
import {router} from './router';
import './styles.css';
import './ultra-system.css';
import {authController} from './services/authSession';
if(authController)void authController.initialize();
createApp(App).use(createPinia()).use(router).mount('#app');
