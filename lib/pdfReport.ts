import { Medicine, daysUntilExpiry } from '../hooks/useMedicines';
import { DoseLog } from '../hooks/useDoseLogs';
import type { MedicalId, Contact } from './supabase';

function adherenceDays(medicineId: string, logs: DoseLog[]): number {
  return new Set(logs.filter(l => l.medicine_id === medicineId).map(l => l.date)).size;
}

function expiryLabel(expiry_date: string | null | undefined): { text: string; color: string } {
  if (!expiry_date) return { text: '—', color: '#6B6B67' };
  const d = daysUntilExpiry(expiry_date);
  if (d < 0) return { text: `Expired ${Math.abs(d)}d ago`, color: '#E24B4A' };
  if (d === 0) return { text: 'Expires today', color: '#E24B4A' };
  if (d <= 7) return { text: expiry_date, color: '#E24B4A' };
  if (d <= 30) return { text: expiry_date, color: '#F58220' };
  return { text: expiry_date, color: '#1A1A1A' };
}

export function generateHealthReportHTML(
  medicines: Medicine[],
  logs: DoseLog[],
  medicalId: MedicalId | null,
  contacts: Contact[],
  userName: string,
  days = 30,
): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const expiringSoon = medicines.filter(m => daysUntilExpiry(m.expiry_date) <= 30);

  const medicineRows = medicines.map(m => {
    const adh = Math.round((adherenceDays(m.id, logs) / days) * 100);
    const { text: expiryText, color: expiryColor } = expiryLabel(m.expiry_date);
    const adhColor = adh >= 80 ? '#1D9E75' : adh >= 50 ? '#F58220' : '#E24B4A';
    return `<tr>
      <td style="font-weight:600">${m.name}</td>
      <td>${m.dosage ?? '—'}</td>
      <td>${m.category ?? '—'}</td>
      <td style="color:${expiryColor};font-weight:600">${expiryText}</td>
      <td>${m.doctor_name ?? '—'}</td>
      <td style="font-weight:700;color:${adhColor};text-align:center">${adh}%</td>
    </tr>`;
  }).join('');

  const expiryItems = expiringSoon.length > 0
    ? expiringSoon.map(m => {
        const d = daysUntilExpiry(m.expiry_date);
        const c = d <= 0 ? '#E24B4A' : d <= 7 ? '#E24B4A' : '#F58220';
        const label = d < 0
          ? `${m.name} — <strong>expired ${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''} ago</strong>`
          : d === 0
          ? `${m.name} — <strong>expires today</strong>`
          : `${m.name} — expires in ${d} day${d !== 1 ? 's' : ''}`;
        return `<li style="color:${c};margin-bottom:5px">${label}</li>`;
      }).join('')
    : '<li style="color:#1D9E75">No medicines expiring within 30 days ✓</li>';

  const contactRows = contacts.length > 0
    ? contacts.map(c => `<tr><td>${c.name}</td><td>${c.role ?? '—'}</td><td>${c.phone ?? '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:#9E9E9A;font-style:italic">No contacts on file</td></tr>';

  const mi = medicalId;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    padding: 32px 28px;
    color: #1A1A1A;
    font-size: 13px;
    line-height: 1.5;
    background: #fff;
  }
  h1 { font-size: 24px; color: #1D9E75; font-weight: 800; margin-bottom: 4px; }
  .sub { color: #6B6B67; font-size: 12px; margin-bottom: 28px; }
  h2 {
    font-size: 11px; color: #1D9E75; font-weight: 700;
    margin: 24px 0 10px;
    border-bottom: 1.5px solid #D6EEE6;
    padding-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  /* Medical info — 2-col table, no CSS grid */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .info-table td { padding: 8px 12px; width: 50%; vertical-align: top; }
  .info-table td:first-child { border-right: 1px solid #F0F0ED; }
  .info-table tr { background: #F8F8F6; }
  .info-table tr:nth-child(odd) { background: #F2F2EF; }
  .info-label { font-size: 10px; color: #9E9E9A; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
  .info-value { font-size: 13px; font-weight: 600; color: #1A1A1A; }
  /* Medicine table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th {
    background: #1D9E75; color: #fff;
    text-align: left; padding: 7px 8px;
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px;
    font-weight: 700;
  }
  td { padding: 8px 8px; border-bottom: 1px solid #F0F0ED; font-size: 12px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: #FAFAF8; }
  /* Expiry warnings */
  ul { margin: 4px 0; padding-left: 18px; }
  li { font-size: 12px; }
  /* Footer */
  .footer {
    margin-top: 36px; text-align: center;
    font-size: 11px; color: #9E9E9A;
    border-top: 1px solid #E8E8E5; padding-top: 14px;
  }
  .pill {
    display: inline-block; background: #1D9E75;
    color: #fff; padding: 3px 14px; border-radius: 12px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  }
  .badge {
    display: inline-block; background: #E8F5F0;
    color: #1D9E75; padding: 2px 8px; border-radius: 8px;
    font-size: 11px; font-weight: 600;
  }
</style>
</head>
<body>

<h1>MedCabinet Health Report</h1>
<p class="sub">Prepared for <strong>${userName}</strong> &nbsp;·&nbsp; ${today}</p>

<h2>Medical Information</h2>
<table class="info-table">
  <tr>
    <td><span class="info-label">Blood Type</span><span class="info-value">${mi?.blood_type || '—'}</span></td>
    <td><span class="info-label">Allergies</span><span class="info-value">${mi?.allergies || '—'}</span></td>
  </tr>
  <tr>
    <td><span class="info-label">Emergency Contact</span><span class="info-value">${mi?.emergency_contact_name || '—'}</span></td>
    <td><span class="info-label">Emergency Phone</span><span class="info-value">${mi?.emergency_contact_phone || '—'}</span></td>
  </tr>
  ${mi?.notes ? `<tr><td colspan="2"><span class="info-label">Notes</span><span class="info-value">${mi.notes}</span></td></tr>` : ''}
</table>

<h2>Medicine Cabinet &nbsp;<span style="font-weight:400;text-transform:none;letter-spacing:0;color:#6B6B67">${medicines.length} medicine${medicines.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${days}-day period</span></h2>
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Dosage</th>
      <th>Category</th>
      <th>Expiry</th>
      <th>Doctor</th>
      <th style="text-align:center">Adherence</th>
    </tr>
  </thead>
  <tbody>${medicineRows || '<tr><td colspan="6" style="color:#9E9E9A;font-style:italic;text-align:center;padding:16px">No medicines on file</td></tr>'}</tbody>
</table>

<h2>Expiry Warnings</h2>
<ul>${expiryItems}</ul>

<h2>Doctors &amp; Contacts</h2>
<table>
  <thead><tr><th>Name</th><th>Role</th><th>Phone</th></tr></thead>
  <tbody>${contactRows}</tbody>
</table>

<div class="footer">
  <span class="pill">MedCabinet</span><br><br>
  Generated on ${today}<br>
  <span style="font-size:10px">This report is for informational purposes only and does not constitute medical advice.</span>
</div>

</body>
</html>`.trim();
}
