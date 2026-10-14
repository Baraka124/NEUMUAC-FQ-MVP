import { fixtures } from './variants';
import type { VariantRecord, ResearchEvidence } from '../domain/variantRecord';

const syntheticProvenance = {
  sourceName: 'NeumuacFQ demonstration fixture',
  origin: 'synthetic-fixture' as const,
  sourceVersion: 'phase-2',
  retrievedAt: null,
  referenceId: null
};

const exampleEvidence = (id: string, title: string, description: string): ResearchEvidence => ({
  id, title, description, state: 'unreviewed',
  provenance: syntheticProvenance
});

/**
 * Synthetic variant identifiers are NOT CFTR variants. These metadata and source
 * examples are fabricated to test how uncertainty and provenance are rendered.
 */
export const DEMO_RECORDS: readonly VariantRecord[] = [
  {
    ...fixtures[0],
    summary: 'A fabricated example with two unreviewed evidence references for layout and workflow testing.',
    nomenclature: { legacy: 'DEMO-CFTR-001', protein: null, cdna: null },
    recordSource: syntheticProvenance,
    evidence: [
      exampleEvidence('example-ev-01', 'Demonstration literature record', 'Invented citation placeholder; not a PubMed article.'),
      exampleEvidence('example-ev-02', 'Demonstration research annotation', 'Fabricated note for source-attribution testing.')
    ],
    history: [
      { id: 'history-01', kind: 'fixture-created', recordedAt: null, actorLabel: 'Synthetic fixture',
        note: 'Record created for interface validation; no clinical review has occurred.' },
      { id: 'history-02', kind: 'review-requested', recordedAt: null, actorLabel: 'Synthetic fixture',
        note: 'Illustrates a pending review request, not an actual assigned clinical task.' }
    ]
  },
  {
    ...fixtures[1],
    summary: 'This fabricated record deliberately contains no evidence, so absence is never confused with negative findings.',
    nomenclature: { legacy: 'DEMO-CFTR-002', protein: null, cdna: null },
    recordSource: syntheticProvenance,
    evidence: [],
    history: [
      { id: 'history-03', kind: 'fixture-created', recordedAt: null, actorLabel: 'Synthetic fixture',
        note: 'No scientific evidence was attached.' }
    ]
  },
  {
    ...fixtures[2],
    summary: 'A synthetic, unreviewed record demonstrating alias search and explicit provenance boundaries.',
    nomenclature: { legacy: 'DEMO-CFTR-003', protein: null, cdna: null },
    recordSource: syntheticProvenance,
    evidence: [
      exampleEvidence('example-ev-03', 'Demonstration external-source placeholder', 'No external provider was contacted.')
    ],
    history: [
      { id: 'history-04', kind: 'fixture-created', recordedAt: null, actorLabel: 'Synthetic fixture',
        note: 'Research demonstration record; scientific claims intentionally absent.' }
    ]
  }
];

export const DEMO_RECORDS_ARE_SYNTHETIC = true as const;
