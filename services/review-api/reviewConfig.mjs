/**
 * Phase 14G7A — predeployment policy for a potential Node/Railway review API.
 * No credentials or network calls are performed when disabled. Enabling in a
 * future hosted environment requires an independent rollout, not this module.
 */
const reviewOrigins=new Set(['https://fq.neumact.org']);
const LIVE_CFTR_PROJECT_REF='oxlkisjwfarseyqgeyuw'; // Public ref, not a secret.

const uuid=/^[a-z0-9]{20}$/i;
const allowedHost=host=>/^db\.[a-z0-9]{20}\.supabase\.co$/i.test(host)
  ||/^[a-z0-9.-]+\.pooler\.supabase\.com$/i.test(host);
function required(environment,key){
 const value=environment[key];
 if(typeof value!=='string'||!value.trim())throw new Error('Missing review service configuration: '+key);
 return value.trim();
}
function enabled(environment,key){
 const value=environment[key];
 if(value!==undefined&&value!=='true'&&value!=='false')
  throw new Error('Invalid boolean review service switch: '+key);
 return value==='true';
}
export function readReviewServiceConfig(environment={}){
 const active=enabled(environment,'NFQ_REVIEW_SERVICE_ENABLED');
 const queue=enabled(environment,'NFQ_REVIEW_QUEUE_ENABLED');
 const submissions=enabled(environment,'NFQ_REVIEW_SUBMISSIONS_ENABLED');
 const decisions=enabled(environment,'NFQ_REVIEW_DECISIONS_ENABLED');
 if(!active){
  if(queue||submissions||decisions)
   throw new Error('Review operation switched on without service activation');
  return Object.freeze({active:false,queue:false,submissions:false,decisions:false,
   allowedOrigin:'https://fq.neumact.org'});
 }
 if(environment.NFQ_REVIEW_EXECUTION_SCOPE!=='isolated-testing')
  throw new Error('Live review execution requires a separate approved deployment');
 const allowedOrigin=required(environment,'NFQ_REVIEW_ALLOWED_ORIGIN');
 if(!reviewOrigins.has(allowedOrigin))throw new Error('Unapproved review frontend origin');
 const authOrigin=required(environment,'NFQ_SUPABASE_AUTH_ORIGIN');
 let authUrl;
 try{authUrl=new URL(authOrigin)}catch{throw new Error('Invalid Supabase Auth origin')}
 if(authUrl.protocol!=='https:'||authUrl.username||authUrl.password||
    authUrl.port||authUrl.pathname!=='/'||authUrl.search||authUrl.hash||
    !/^[a-z0-9]{20}\.supabase\.co$/i.test(authUrl.hostname))
  throw new Error('Untrusted Supabase Auth endpoint');
 const project=authUrl.hostname.split('.')[0];
 if(!uuid.test(project))throw new Error('Invalid auth project');
 // Isolated testing may never issue review commands against the known live
 // neumuacFQ project, even if a deploy accidentally receives live credentials.
 if(project===LIVE_CFTR_PROJECT_REF)
  throw new Error('Live CFTR project is forbidden in isolated review execution');
 const key=required(environment,'NFQ_SUPABASE_AUTH_PUBLIC_KEY');
 const dbString=required(environment,'NFQ_REVIEW_TRANSPORT_DSN');
 let db;
 try{db=new URL(dbString)}catch{throw new Error('Invalid database transport')}
 if(!['postgres:','postgresql:'].includes(db.protocol)||
    db.username!=='nfq_review_transport'||!db.password||!allowedHost(db.hostname)||
    db.hash||db.searchParams.has('sslmode')&&db.searchParams.get('sslmode')==='disable')
  throw new Error('Unapproved privileged database transport');
 // The transport host must be directly attributable to the same isolated
 // project. Pooled/project-ambiguous hostnames need a separately audited
 // live-release scope; they are not accepted by this CI-only service.
 if(db.hostname!=='db.'+project+'.supabase.co')
  throw new Error('Isolated database host must match verified Auth project');
 if(db.port&&db.port!=='5432')
  throw new Error('Unexpected isolated database port');
 if(db.searchParams.get('sslmode')!=='require')
  throw new Error('Isolated database connection requires TLS');
 if(!['postgres','review_test'].includes(db.pathname.slice(1)))
  throw new Error('Unexpected database name');
 if(db.pathname==='/review_test'&&environment.NFQ_REVIEW_EXECUTION_SCOPE!=='isolated-testing')
  throw new Error('Test database requires isolated execution');
 // The DSN remains private and must never be echoed, logged or sent to clients.
 return Object.freeze({
  active:true,queue,submissions,decisions,allowedOrigin,
  authOrigin:authUrl.origin,authPublicKey:key,transportDsn:dbString
 });
}
