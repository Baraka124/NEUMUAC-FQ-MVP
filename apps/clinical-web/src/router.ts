import {createRouter,createWebHashHistory} from 'vue-router';
import Overview from './views/Overview.vue';
import Variants from './views/Variants.vue';
import Planned from './views/Planned.vue';
import SignIn from './views/SignIn.vue';
import Administration from './views/Administration.vue';
export const sections=[{path:'/',name:'Overview'},{path:'/variants',name:'Variants'},{path:'/evidence',name:'Evidence & Curation'},{path:'/helios',name:'Helios Review'},{path:'/genotype',name:'Genotype'},{path:'/intelligence',name:'Intelligence'},{path:'/reports',name:'Reports & Audit'},{path:'/governance',name:'Governance'}];
export const router=createRouter({history:createWebHashHistory(),routes:[{path:'/',component:Overview},{path:'/sign-in',component:SignIn},{path:'/admin',component:Administration},{path:'/variants',component:Variants},{path:'/variants/:id',component:Variants},...sections.slice(2).map(x=>({path:x.path,component:Planned,props:{title:x.name}})),{path:'/:catchAll(.*)*',redirect:'/'}]});
