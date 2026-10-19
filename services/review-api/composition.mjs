/**
 * Explicit dependency composition only — no listen(), SQL migration, logging,
 * filesystem access or Railway deployment. Reuses the same private executor
 * for the queue and review, and verifies each request with Supabase Auth.
 */
import {createReviewHttpServer} from './httpServer.mjs';
import {readReviewServiceConfig} from './reviewConfig.mjs';
import {createSupabaseVerifier} from '../../supabase/functions/_shared/reviewGateway.mjs';
import {createPrivateReviewExecutor} from '../../supabase/functions/_shared/privateReviewExecutor.mjs';
import {createPrivateReviewQueueReader} from '../../supabase/functions/_shared/privateReviewQueueReader.mjs';

export function createReviewService({environment={},databaseTransaction,authTransport}={}){
 const config=readReviewServiceConfig(environment);
 if(!config.active){
  // No database credentials or Auth configuration is inspected or required.
  return Object.freeze({server:createReviewHttpServer({}),active:false});
 }
 if(typeof databaseTransaction!=='function'||typeof authTransport!=='function')
  throw new Error('Trusted Auth transport and private database transaction are required');
 const verifyUser=createSupabaseVerifier({authOrigin:config.authOrigin,
  publishableKey:config.authPublicKey,transport:authTransport});
 const executor=createPrivateReviewExecutor({withTransaction:databaseTransaction});
 const reader=createPrivateReviewQueueReader({withTransaction:databaseTransaction});
 return Object.freeze({active:true,server:createReviewHttpServer({
  verifyUser,executeReview:executor,readQueue:reader,
  enabled:config.queue,submissionEnabled:config.submissions,
  reviewerDecisionEnabled:config.decisions,allowedOrigin:config.allowedOrigin
 })});
}
