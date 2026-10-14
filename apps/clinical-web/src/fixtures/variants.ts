import type {VariantPreview} from '../domain/variant';
/** Fictional identifiers, not real CFTR variants or clinical evidence. */
export const fixtures:readonly VariantPreview[]=[{id:'sample-001',name:'DEMO-CFTR-001',aliases:['example-alpha'],evidenceCount:2,reviewState:'review-planned'},{id:'sample-002',name:'DEMO-CFTR-002',aliases:['example-beta'],evidenceCount:0,reviewState:'needs-evidence'},{id:'sample-003',name:'DEMO-CFTR-003',aliases:['example-gamma'],evidenceCount:1,reviewState:'unreviewed'}];
