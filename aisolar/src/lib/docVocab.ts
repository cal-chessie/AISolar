/**
 * docVocab — THE one document vocabulary (Cal, 4 Aug: "worst thing is a mistake
 * in the paper trail"). Three naming systems had grown up separately and drifted:
 *
 *   1. decideCompliance.requiredDocs  — short ids ('seai_app','dow','reci'…)
 *   2. lead_documents.doc_type CHECK  — long ids ('seai_application','declaration_of_works','reci_cert'…)
 *   3. fieldRecord.CertRecord keys    — cert keys ('reci','dow','typeTest','sld')
 *
 * A row written under one name and read under another silently loses a document
 * from the pack. This module is the SINGLE reconciliation: every document has
 * ONE canonical `doc_type` (the DB is the source of truth), and this table maps
 * every other name onto it. Nothing else in the app should hardcode a doc id —
 * it should resolve through here.
 */

/** The canonical ids — exactly the lead_documents.doc_type CHECK values. */
export type DocType =
  | 'seai_application' | 'seai_offer'
  | 'esb_loa' | 'nc6' | 'nc7' | 'nc7_01' | 'nc7_02' | 'nc7_03' | 'nc8' | 'nc5'
  | 'block_diagram' | 'declaration_of_works' | 'datasheet'
  | 'inspection_test_cert' | 'reci_cert' | 'ber_cert' | 'type_test_cert'
  | 'handover_pack' | 'other';

/** fieldRecord.CertRecord keys that ARE formal pack documents. */
export type CertKey = 'reci' | 'dow' | 'typeTest' | 'sld';

export interface DocSpec {
  doc_type: DocType;
  /** The short id decideCompliance emits (if any). */
  shortId?: string;
  /** The fieldRecord cert key that supplies this document's file (if any). */
  certKey?: CertKey;
  /** Plain-English label — the one name shown at every human touchpoint. */
  label: string;
  /** Is this a file physically ATTACHED to the ESB pack (vs a tracked status)? */
  esbAttachment: boolean;
  /** Does a registered human sign it (RECI / installer)? */
  humanSigned: boolean;
}

/** The registry — one row per document, canonical doc_type first. */
export const DOC_SPECS: DocSpec[] = [
  { doc_type: 'seai_application',    shortId: 'seai_app',      label: 'SEAI grant application',              esbAttachment: false, humanSigned: false },
  { doc_type: 'seai_offer',         shortId: 'seai_offer',    label: 'SEAI grant offer',                    esbAttachment: false, humanSigned: false },
  { doc_type: 'esb_loa',            shortId: 'esb_loa',       label: 'ESB letter of authorisation',         esbAttachment: false, humanSigned: true  },
  { doc_type: 'nc6',                shortId: 'nc6',           label: 'NC6 application',                     esbAttachment: true,  humanSigned: true  },
  { doc_type: 'nc7_01',             shortId: 'nc7_01',        label: 'NC7 form — part 1',                   esbAttachment: true,  humanSigned: true  },
  { doc_type: 'nc7_02',             shortId: 'nc7_02',        label: 'NC7 form — part 2',                   esbAttachment: true,  humanSigned: true  },
  { doc_type: 'block_diagram',      shortId: 'block_diagram', certKey: 'sld', label: 'Single-line diagram (SLD)', esbAttachment: true, humanSigned: false },
  { doc_type: 'declaration_of_works', shortId: 'dow',         certKey: 'dow', label: 'Declaration of Works',      esbAttachment: true, humanSigned: true  },
  { doc_type: 'inspection_test_cert', shortId: 'itc',         label: 'Inspection & test certificate (I.S. 10101)', esbAttachment: true, humanSigned: true },
  { doc_type: 'reci_cert',          shortId: 'reci',          certKey: 'reci', label: 'Safe Electric (RECI) certificate', esbAttachment: true, humanSigned: true },
  { doc_type: 'type_test_cert',                               certKey: 'typeTest', label: 'Inverter type-test certificate', esbAttachment: true, humanSigned: false },
  { doc_type: 'datasheet',          shortId: 'datasheet',     label: 'Inverter / panel datasheet',          esbAttachment: true,  humanSigned: false },
  { doc_type: 'ber_cert',           shortId: 'ber',           label: 'BER certificate',                     esbAttachment: false, humanSigned: false },
  { doc_type: 'handover_pack',                                label: 'Customer handover pack',              esbAttachment: false, humanSigned: false },
];

const BY_DOC_TYPE = new Map(DOC_SPECS.map(s => [s.doc_type, s]));
const BY_SHORT = new Map(DOC_SPECS.filter(s => s.shortId).map(s => [s.shortId!, s]));
const BY_CERT = new Map(DOC_SPECS.filter(s => s.certKey).map(s => [s.certKey!, s]));

/** Resolve decideCompliance's short id → canonical doc_type. */
export function docTypeFromShort(shortId: string): DocType | null {
  return BY_SHORT.get(shortId)?.doc_type ?? null;
}
/** Resolve a fieldRecord cert key → canonical doc_type. */
export function docTypeFromCert(cert: CertKey): DocType | null {
  return BY_CERT.get(cert)?.doc_type ?? null;
}
/** The human label for a canonical doc_type. */
export function docLabel(doc: DocType): string {
  return BY_DOC_TYPE.get(doc)?.label ?? doc;
}
export function docSpec(doc: DocType): DocSpec | undefined {
  return BY_DOC_TYPE.get(doc);
}
