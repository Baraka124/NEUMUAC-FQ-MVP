import {createClient, type Session, type SupabaseClient} from '@supabase/supabase-js';
import {reactive, readonly} from 'vue';
import {readConfigFromEnvironment, validateReadOnlyConfig, type ReadSessionProvider} from './liveVariants';

export type AuthPhase='checking'|'signed-out'|'signed-in'|'error';
export interface AuthView {
  phase: AuthPhase;
  email: string | null;
  message: string | null;
}
export type AuthPort = Pick<SupabaseClient['auth'], 'getSession' | 'signInWithPassword' | 'signOut' | 'onAuthStateChange'>;

function verifiedEmail(session:Session|null):string|null {
  return typeof session?.user?.email==='string' ? session.user.email : null;
}
/** Client session drives UI state only. Supabase REST and RLS must verify access. */
export function createAuthController(auth:AuthPort) {
  const state=reactive<AuthView>({phase:'checking',email:null,message:null});
  let sequence=0;
  function applySession(session:Session|null):void {
    state.phase=session?.access_token?'signed-in':'signed-out';
    state.email=session?.access_token?verifiedEmail(session):null;
    state.message=null;
  }
  auth.onAuthStateChange((_event,session)=>{
    ++sequence;
    applySession(session);
  });
  return {
    state:readonly(state),
    async initialize():Promise<void>{
      const current=sequence;
      try {
        const {data,error}=await auth.getSession();
        if(current!==sequence)return;
        if(error){state.phase='error';state.message='The authentication session could not be restored.';return;}
        applySession(data.session);
      }catch{
        if(current===sequence){state.phase='error';state.message='Authentication is currently unavailable.';}
      }
    },
    async signIn(email:string,password:string):Promise<boolean>{
      if(!email.trim()||!password)return false;
      state.message=null;
      try {
        const {data,error}=await auth.signInWithPassword({email:email.trim(),password});
        if(error||!data.session){state.message='Sign-in failed. Check your credentials and account access.';return false;}
        applySession(data.session);
        return true;
      }catch{
        state.message='Sign-in could not be completed. Please try again.';
        return false;
      }
    },
    async signOut():Promise<boolean>{
      // Clear visible data before waiting for any network response.
      ++sequence;
      applySession(null);
      try {
        const {error}=await auth.signOut({scope:'local'});
        if(error){state.message='Local session ended. Remote sign-out could not be confirmed.';return false;}
        return true;
      }catch{
        state.message='Local session ended. Remote sign-out could not be confirmed.';
        return false;
      }
    },
    async getAccessToken():Promise<string|null>{
      try {
        const {data,error}=await auth.getSession();
        if(error||!data.session?.access_token){++sequence;applySession(null);return null;}
        return data.session.access_token;
      }catch{return null;}
    }
  };
}
export type AuthController=ReturnType<typeof createAuthController>;

function configureAuth():AuthController|null {
  const cfg=readConfigFromEnvironment();
  // Signing in grants a session for authorized staff operations; public catalog
  // reads can remain anonymous independently of the authentication controller.
  if(!cfg)return null;
  try {validateReadOnlyConfig(cfg);} catch {return null;}
  const client=createClient(cfg.endpoint,cfg.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
  });
  return createAuthController(client.auth);
}
export const authController=configureAuth();
export const authSessionProvider:ReadSessionProvider|undefined=authController??undefined;
