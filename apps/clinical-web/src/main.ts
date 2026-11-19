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
import './original-signature.css';
import './midnight-workspace.css';
import './phone-native.css';
import './reconciled-search-theme.css';
import './reports-audit.css';
import './governance-shell-consistency.css';
import './conflict-review-preparation.css';
import './evidence-conflict-traceability.css';
import './original-workflow-parity.css';
import './premium-visual-finish.css';
import './premium-control-coherence.css';
import './editorial-research-system.css';
// E01 design foundation remains last: optical tokens without clinical data changes.
import './clinical-editorial-foundation.css';
import './clinical-control-precision.css';
import './clinical-editorial-integration.css';
import {authController} from './services/authSession';
import {refreshResearcherRole} from './services/researchRole';
import {refreshGuestDesignation} from './services/guestDesignation';
import {consumeInvitationReturn} from './services/invitationActivation';
async function start(){
 const isInvite=await consumeInvitationReturn(window.location,
  url=>window.history.replaceState(null,'',url));
 if(authController&&!isInvite)await authController.initialize();
 // Creating the hash router before reading an Auth callback can rewrite the
 // #access_token fragment to #/, destroying the one-time invitation return.
 const router=createClinicalRouter();
 createApp(App).use(createPinia()).use(router).mount('#app');
 // Some persisted sessions are restored before account modules register their
 // initial watchers. Resolve both independent FQ access channels once the
 // application is mounted; each lookup verifies its own session and RLS.
 if(authController?.state.phase==='signed-in'){
  void refreshResearcherRole();
  void refreshGuestDesignation();
 }
}
void start();
