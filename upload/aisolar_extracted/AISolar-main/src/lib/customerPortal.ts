import { supabase } from '@/integrations/supabase/client';

export function generateAccessToken(): string {
  // Generate a secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createCustomerPortalLink(leadId: string): Promise<string> {
  const token = generateAccessToken();
  
  const { error } = await supabase
    .from('leads')
    .update({ access_token: token })
    .eq('id', leadId);

  if (error) throw error;

  const baseUrl = window.location.origin;
  return `${baseUrl}/customer/${token}`;
}

export async function getExistingPortalLink(leadId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('access_token')
    .eq('id', leadId)
    .single();

  if (error || !data?.access_token) return null;

  const baseUrl = window.location.origin;
  return `${baseUrl}/customer/${data.access_token}`;
}