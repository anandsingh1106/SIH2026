import React from 'react';
import { createPortal } from 'react-dom';
import { Prescription } from '../../types';

/**
 * Print layout for a single prescription.
 *
 * Rendered off-screen and revealed only during printing, so `window.print()`
 * produces the prescription alone rather than the surrounding dashboard.
 * The print rules live in globals.css under the `@media print` block.
 *
 * Mounted through a portal onto <body>, deliberately outside #root: printing
 * hides #root, and a node inside it would be hidden along with its ancestor no
 * matter what is done to the node itself.
 */
export const PrintablePrescription: React.FC<{ prescription: Prescription | null }> = ({
  prescription,
}) => {
  if (!prescription) return null;

  const rx = prescription;
  const issued = rx.date ? new Date(rx.date) : new Date();

  return createPortal(
    <div id="printable-prescription" aria-hidden="true">
      {/* Letterhead */}
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a' }}>
              MahaAarogya Sangam
            </h1>
            <p style={{ fontSize: 11, margin: '2px 0 0', color: '#475569' }}>
              Government of Maharashtra · Department of Public Health
            </p>
            {rx.facilityName && (
              <p style={{ fontSize: 11, margin: '2px 0 0', color: '#475569' }}>{rx.facilityName}</p>
            )}
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>E-PRESCRIPTION</div>
            <div>Issued: {issued.toLocaleDateString('en-IN')}</div>
            {rx.id && <div style={{ fontFamily: 'monospace' }}>ID: {String(rx.id).slice(0, 8)}</div>}
          </div>
        </div>
      </div>

      {/* Patient and prescriber */}
      <table style={{ width: '100%', fontSize: 12, marginBottom: 16, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 0', width: '50%' }}>
              <strong>Patient:</strong> {rx.patientName || '—'}
            </td>
            <td style={{ padding: '4px 0' }}>
              <strong>Prescriber:</strong> {rx.doctorName || '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Medicines */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>℞</div>
      <table
        style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 16 }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={cell('left')}>#</th>
            <th style={cell('left')}>Medicine</th>
            <th style={cell('left')}>Dosage</th>
            <th style={cell('left')}>Frequency</th>
            <th style={cell('left')}>Duration</th>
            <th style={cell('left')}>Qty</th>
          </tr>
        </thead>
        <tbody>
          {(rx.medicines ?? []).map((m, i) => (
            <tr key={i}>
              <td style={cell('left')}>{i + 1}</td>
              <td style={cell('left')}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                {m.instructions && (
                  <div style={{ color: '#475569', fontSize: 10 }}>{m.instructions}</div>
                )}
                {m.instructionsMr && (
                  <div style={{ color: '#475569', fontSize: 10 }}>{m.instructionsMr}</div>
                )}
              </td>
              <td style={cell('left')}>{m.dosage || '—'}</td>
              <td style={cell('left')}>{m.frequency || '—'}</td>
              <td style={cell('left')}>{m.duration || '—'}</td>
              <td style={cell('left')}>{m.quantity ?? '—'}</td>
            </tr>
          ))}
          {(rx.medicines ?? []).length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...cell('left'), color: '#64748b' }}>
                No medicines recorded on this prescription.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Advice */}
      {rx.generalAdvice && (
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          <strong>General advice:</strong> {rx.generalAdvice}
        </div>
      )}
      {rx.dietaryInstructions && (
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          <strong>Diet:</strong> {rx.dietaryInstructions}
        </div>
      )}
      {rx.followUpDate && (
        <div style={{ fontSize: 11, marginBottom: 8 }}>
          <strong>Follow-up:</strong> {new Date(rx.followUpDate).toLocaleDateString('en-IN')}
        </div>
      )}

      {/* Signature */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <div style={{ color: '#64748b' }}>
          Digitally issued via MahaAarogya Sangam.
          <br />
          Valid without a physical signature.
        </div>
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: 4, marginTop: 24 }}>
            {rx.doctorName || 'Prescribing Clinician'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

function cell(align: 'left' | 'center'): React.CSSProperties {
  return {
    border: '1px solid #cbd5e1',
    padding: '5px 7px',
    textAlign: align,
    verticalAlign: 'top',
  };
}
