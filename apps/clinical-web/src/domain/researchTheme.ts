/** Presentation preference only. No auth, research, or clinical persistence. */
export const RESEARCH_THEME_STORAGE_KEY='nfq-research-theme-v1';
export type ResearchTheme='light'|'midnight';
export function parseResearchTheme(value:unknown):ResearchTheme{
 return value==='midnight'?'midnight':'light';
}
export function nextResearchTheme(theme:ResearchTheme):ResearchTheme{
 return theme==='light'?'midnight':'light';
}
