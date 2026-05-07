import { supabase } from './supabase';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'CAREGIVER_ACCESS'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REVOKED'
  | 'SESSION_TIMEOUT';

export type AuditResource =
  | 'medicines'
  | 'dose_logs'
  | 'medical_id'
  | 'contacts'
  | 'family_members'
  | 'symptom_logs'
  | 'caregiver_links'
  | 'auth';

export async function logAuditEvent(
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action,
    resource,
    resource_id: resourceId ?? null,
    metadata: metadata ?? {},
  });
}
