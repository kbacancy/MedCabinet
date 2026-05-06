import { Medicine, daysUntilExpiry } from '../hooks/useMedicines';
import { DoseLog } from '../hooks/useDoseLogs';
import type { MedicalId, Contact } from './supabase';

function adherenceDays(medicineId: string, logs: DoseLog[]): number {
  return new Set(logs.filter(l => l.medicine_id === medicineId).map(l => l.date)).size;
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
    const dLeft = daysUntilExpiry(m.expiry_date);
    const adh = Math.round((adherenceDays(m.id, logs) / days) * 100);
    const expiryColor = dLeft <= 7 ? '#E24B4A' : dLeft <= 30 ? '#F58220' : '#1D9E75';
    return `<tr>
      <td>${m.name}</td>
      <td>${m.dosage ?? '—'}</td>
      <td>${m.category ?? '—'}</td>
      <td style="color:${expiryColor};font-weight:600">${m.expiry_date ?? '—'}</td>
      <td>${m.doctor_name ?? '—'}</td>
      <td style="font-weight:600">${adh}%</td>
    </tr>`;
  }).join('');

  const expiryItems = expiringSoon.length > 0
    ? expiringSoon.map(m => {
        const d = daysUntilExpiry(m.expiry_date);
        const c = d <= 7 ? '#E24B4A' : '#F58220';
        return `<li style="color:${c}">${m.name} — expires in ${d} day${d !== 1 ? 's' : ''}</li>`;
      }).join('')
    : '<li style="color:#1D9E75">No medicines expiring within 30 days ✓</li>';

  const contactRows = contacts.length > 0
    ? contacts.map(c => `<tr><td>${c.name}</td><td>${c.role ?? '—'}</td><td>${c.phone ?? '—'}</td></tr>`).join('')
    : '<tr><td colspan="3" style="color:#9E9E9A;font-style:italic">No contacts on file</td></tr>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;margin:0;padding:28px;color:#1A1A1A;font-size:13px;line-height:1.5}
  h1{font-size:22px;color:#1D9E75;margin:0 0 2px}
  h2{font-size:13px;color:#1D9E75;margin:22px 0 8px;border-bottom:1px solid #E8E8E5;padding-bottom:4px;text-transform:uppercase;letter-spacing:.8px}
  .sub{color:#6B6B67;font-size:12px;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#F8F8F6;border-radius:8px;padding:12px;margin-bottom:4px}
  .cell label{font-size:10px;color:#9E9E9A;text-transform:uppercase;letter-spacing:.5px;display:block}
  .cell p{margin:2px 0 0;font-weight:600;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-bottom:4px}
  th{background:#F0F0ED;text-align:left;padding:6px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6B6B67}
  td{padding:7px 8px;border-bottom:1px solid #F0F0ED;font-size:12px}
  tr:last-child td{border-bottom:none}
  ul{margin:4px 0;padding-left:18px}
  li{margin-bottom:3px;font-size:12px}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#9E9E9A;border-top:1px solid #E8E8E5;padding-top:12px}
  .pill{display:inline-block;background:#E8F5F0;color:#1D9E75;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600}
</style>
</head>
<body>

<h1>MedCabinet Health Report</h1>
<p class="sub">Prepared for <strong>${userName}</strong> &nbsp;·&nbsp; ${today}</p>

<h2>Medical Information</h2>
<div class="grid">
  <div class="cell"><label>Blood Type</label><p>${medicalId?.blood_type || '—'}</p></div>
  <div class="cell"><label>Allergies</label><p>${medicalId?.allergies || '—'}</p></div>
  <div class="cell"><label>Emergency Contact</label><p>${medicalId?.emergency_contact_name || '—'}</p></div>
  <div class="cell"><label>Emergency Phone</label><p>${medicalId?.emergency_contact_phone || '—'}</p></div>
</div>
${medicalId?.notes ? `<p style="color:#6B6B67;font-size:12px;margin-top:6px">${medicalId.notes}</p>` : ''}

<h2>Medicine Cabinet &nbsp;<span style="font-weight:normal;text-transform:none;letter-spacing:0">(${medicines.length} medicine${medicines.length !== 1 ? 's' : ''})</span></h2>
<table>
  <thead><tr><th>Name</th><th>Dosage</th><th>Category</th><th>Expiry</th><th>Doctor</th><th>${days}-Day Adherence</th></tr></thead>
  <tbody>${medicineRows || '<tr><td colspan="6" style="color:#9E9E9A;font-style:italic">No medicines on file</td></tr>'}</tbody>
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
  Generated on ${today} &nbsp;·&nbsp; This report is for informational purposes only and does not constitute medical advice.
</div>

</body>
</html>`.trim();
}
