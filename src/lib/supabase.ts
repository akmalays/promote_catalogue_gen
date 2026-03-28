import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client.
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY need to be added to your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchVisitors() {
  const { data, error } = await supabase
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching visitors:', error);
    return [];
  }
  return data;
}

export async function addVisitor(visitor: { name: string; phone: string }) {
  const { data, error } = await supabase
    .from('visitors')
    .insert([{ ...visitor, selected: false }])
    .select();

  if (error) {
    console.error('Error adding visitor:', error);
    throw error;
  }
  return data?.[0];
}

export async function updateVisitor(id: string, updates: any) {
  const { data, error } = await supabase
    .from('visitors')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating visitor:', error);
    throw error;
  }
  return data?.[0];
}

export async function deleteVisitor(id: string) {
  const { error } = await supabase
    .from('visitors')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting visitor:', error);
    throw error;
  }
  return true;
}
