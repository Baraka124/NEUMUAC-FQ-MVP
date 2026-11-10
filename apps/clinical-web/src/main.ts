import {createApp} from 'vue';
import {createPinia} from 'pinia';
import App from './App.vue';
import {createClinicalRouter} from './router';
import './styles.css';
import './ultra-system.css';
import './modulator-intelligence.css';
import './variant-discovery-system.css';
import './science-operations-system.css';
import './institutional-shell.css';
import './clinical-mineral.css';
import './user-profile-shell.css';
import {authController} from './services/authSession';
import {consumeInvitationReturn} from './services/invitationActivation';
async function start(){
 const isInvite=await consumeInvitationReturn(window.location,
  url=>window.history.replaceState(null,'',url));
 if(authController&&!isInvite)await authController.initialize();
 // Creating the hash router before reading an Auth callback can rewrite the
 // #access_token fragment to #/, destroying the one-time invitation return.
 const router=createClinicalRouter();
 createApp(App).use(createPinia()).use(router).mount('#app');
}
void start();
