import type {DecisionRegister} from './nomenclatureGovernance';
/** Deliberately inert. These are open review tickets, not activated aliases. */
export const NOMENCLATURE_REGISTER:DecisionRegister={
 schemaVersion:'1.0.0',rulesetVersion:'0.0.1',legacyBlobSha:'c18221fb6baf47782318ca3685b94b088c359a66',
 activation:'disabled',
 decisions:[
  {id:'NFQ-NOM-001',revision:1,kind:'alias-equivalence',status:'proposed',input:'ΔF508',proposedBy:'phase-2f-engineering',
   proposedOn:'2026-10-14',rationale:'Greek uppercase delta result mismatch; identity and transcript equivalence unverified.',
   target:null,sourceReferences:[],reviews:[],decidedOn:null,dispositionNotes:null,supersedesId:null},
  {id:'NFQ-NOM-002',revision:1,kind:'alias-equivalence',status:'proposed',input:'δF508',proposedBy:'phase-2f-engineering',
   proposedOn:'2026-10-14',rationale:'Greek lowercase delta mismatch; requires independent evidence and review.',
   target:null,sourceReferences:[],reviews:[],decidedOn:null,dispositionNotes:null,supersedesId:null},
  {id:'NFQ-GATE-003',revision:1,kind:'search-disposition',status:'proposed',input:'patient treatment report',
   proposedBy:'phase-2f-engineering',proposedOn:'2026-10-14',
   rationale:'Query filtering and analytics collection require separate security/product decisions.',
   target:null,sourceReferences:[],reviews:[],decidedOn:null,dispositionNotes:null,supersedesId:null}
 ]
};
