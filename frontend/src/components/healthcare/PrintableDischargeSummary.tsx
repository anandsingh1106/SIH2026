import React from 'react';
import { createPortal } from 'react-dom';

export interface DischargeMedicine {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
}

export interface DischargeSummaryData {
  patientName: string;
  abhaId: string;
  admissionDate: string;
  dischargeDate: string;
  consultant: string;
  facilityName: string;
  department: string;
  diagnosis: string[];
  hospitalCourse: string;
  medicines: DischargeMedicine[];
  handoffDirectives: string[];
}

/**
 * Print layout for a discharge summary.
 *
 * Mounted through a portal onto <body>, outside #root: printing hides #root,
 * and a node inside it would be hidden along with its ancestor. Shares the
 * `printing-document` rules in globals.css with the prescription slip.
 */
export const PrintableDischargeSummary: React.FC<{ summary: DischargeSummaryData | null }> = ({
  summary,
}) => {
  if (!summary) return null;
  const s = summary;

  return createPortal(
    <div id="printable-prescription" aria-hidden="true">
      {/* Letterhead */}
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {s.facilityName}
            </h1>
            <p style={{ fontSize: 11, margin: '2px 0 0', color: '#475569' }}>
              Government of Maharashtra · Public Health Department
            </p>
            <p style={{ fontSize: 11, margin: '2px 0 0', color: '#475569' }}>{s.department}</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>DISCHARGE SUMMARY</div>
            <div>ABDM FHIR R4 Validated</div>
          </div>
        </div>
      </div>

      {/* Patient metadata */}
      <table style={{ width: '100%', fontSize: 11, marginBottom: 16, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={meta}><strong>Patient:</strong> {s.patientName}</td>
            <td style={meta}><strong>ABHA:</strong> {s.abhaId}</td>
          </tr>
          <tr>
            <td style={meta}>
              <strong>Admission / Discharge:</strong> {s.admissionDate} / {s.dischargeDate}
            </td>
            <td style={meta}><strong>Consultant:</strong> {s.consultant}</td>
          </tr>
        </tbody>
      </table>

      <Section title="Final Discharge Diagnosis">
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
          {s.diagnosis.map((d, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{d}</li>
          ))}
        </ol>
      </Section>

      <Section title="Hospital Course & Interventions">
        <p style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>{s.hospitalCourse}</p>
      </Section>

      <Section title="Discharge Medications & Regimen">
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={cell}>#</th>
              <th style={cell}>Medicine</th>
              <th style={cell}>Dosage</th>
              <th style={cell}>Frequency</th>
              <th style={cell}>Instructions</th>
            </tr>
          </thead>
          <tbody>
            {s.medicines.map((m, i) => (
              <tr key={i}>
                <td style={cell}>{i + 1}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{m.name}</td>
                <td style={cell}>{m.dosage}</td>
                <td style={cell}>{m.frequency}</td>
                <td style={cell}>{m.instructions}</td>
              </tr>
            ))}
            {s.medicines.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...cell, color: '#64748b' }}>
                  No discharge medications recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Handoff Directives to ASHA & PHC">
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
          {s.handoffDirectives.map((d, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{d}</li>
          ))}
        </ul>
      </Section>

      {/* Signature */}
      <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <div style={{ color: '#64748b', maxWidth: 300 }}>
          Digitally signed via Ayushman Bharat Health Account.
          <br />
          Dispatched to the patient's ABHA health locker.
        </div>
        <div style={{ textAlign: 'center', minWidth: 190 }}>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: 4, marginTop: 24 }}>
            {s.consultant}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 14, breakInside: 'avoid' }}>
    <h2
      style={{
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: '#0f172a',
        margin: '0 0 5px',
      }}
    >
      {title}
    </h2>
    {children}
  </div>
);

const meta: React.CSSProperties = { padding: '3px 0', width: '50%', verticalAlign: 'top' };

const cell: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '4px 6px',
  textAlign: 'left',
  verticalAlign: 'top',
};
