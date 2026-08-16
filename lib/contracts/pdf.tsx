import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ContractTerms } from './generate';
import { COMPANY } from '@/config/company';

export interface PdfSignatory { role: string; name: string; date: string }

const s = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 50, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2430', lineHeight: 1.5 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  ref: { fontSize: 8, color: '#8a93a3', marginBottom: 16, letterSpacing: 1 },
  intro: { marginBottom: 14, color: '#3a4150' },
  summary: { borderWidth: 1, borderColor: '#eceef1', borderRadius: 4, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eceef1', paddingVertical: 4, paddingHorizontal: 8 },
  rowLast: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8 },
  label: { color: '#8a93a3' },
  val: { fontFamily: 'Helvetica-Bold' },
  h2: { fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 3 },
  body: { color: '#3a4150', marginBottom: 2 },
  juris: { marginTop: 14, color: '#8a93a3' },
  sigWrap: { flexDirection: 'row', marginTop: 26 },
  sigBox: { flex: 1, borderWidth: 1, borderColor: '#d7dcef', borderRadius: 6, padding: 10, marginRight: 10 },
  sigRole: { fontSize: 7, letterSpacing: 1, color: '#3a4a8a', marginBottom: 4 },
  sigName: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  sigDate: { color: '#8a93a3', fontSize: 8, marginTop: 2 },
  footer: { position: 'absolute', bottom: 22, left: 50, right: 50, fontSize: 7, color: '#aab2c0', textAlign: 'center' },
});

const ROLE_LABEL: Record<string, string> = {
  customer: 'Signed by the Customer',
  driver: 'Signed by the Driver',
  avanti_witness: 'Countersigned by Avanti',
  corporate_admin: 'Signed by the Organisation',
};

function ContractPdf({ terms, signatories }: { terms: ContractTerms; signatories: PdfSignatory[] }) {
  const created = new Date(terms.generatedAt);
  return (
    <Document title={terms.title} author={COMPANY.legalName}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{terms.title}</Text>
        <Text style={s.ref}>REF {terms.reference}{Number.isNaN(created.getTime()) ? '' : ` · ${created.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}</Text>

        <Text style={s.intro}>{terms.intro}</Text>

        {terms.summary.length > 0 && (
          <View style={s.summary}>
            {terms.summary.map((it, i) => (
              <View key={i} style={i === terms.summary.length - 1 ? s.rowLast : s.row}>
                <Text style={s.label}>{it.label}</Text>
                <Text style={s.val}>{it.value}</Text>
              </View>
            ))}
          </View>
        )}

        {terms.sections.map((sec, i) => (
          <View key={i} wrap={false}>
            <Text style={s.h2}>{sec.heading}</Text>
            <Text style={s.body}>{sec.body}</Text>
          </View>
        ))}

        <Text style={s.juris}>{terms.jurisdictionNote}</Text>

        {signatories.length > 0 && (
          <View style={s.sigWrap}>
            {signatories.map((sig, i) => (
              <View key={i} style={s.sigBox}>
                <Text style={s.sigRole}>{ROLE_LABEL[sig.role] ?? sig.role}</Text>
                <Text style={s.sigName}>{sig.name}</Text>
                <Text style={s.sigDate}>{sig.date}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer} fixed>{COMPANY.legalName} · Electronically signed agreement · {terms.reference}</Text>
      </Page>
    </Document>
  );
}

export async function renderContractPdf(terms: ContractTerms, signatories: PdfSignatory[]): Promise<Buffer> {
  return renderToBuffer(<ContractPdf terms={terms} signatories={signatories} />);
}
