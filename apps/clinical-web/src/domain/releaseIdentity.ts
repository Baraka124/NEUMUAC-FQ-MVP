/** Public build provenance only. Reject anything except a complete Git commit SHA. */
export const RELEASE_COMMIT_META='nfq-release-commit';
export function normalizeBuildCommit(value:unknown):string|null{
 if(typeof value!=='string'||!/^[0-9a-f]{40}$/i.test(value))return null;
 return value.toLowerCase();
}
/** The production HTML can be inspected without a login, app JavaScript, or
 * Supabase access. Never emit environment configuration or credentials.
 */
export function embedReleaseCommit(html:string,value:unknown):string{
 const sha=normalizeBuildCommit(value);
 if(!sha||!html.includes('</head>'))return html;
 return html.replace('</head>',`<meta name="${RELEASE_COMMIT_META}" content="${sha}"/></head>`);
}
