import { supabase } from './supabase';

export const api = {
  login: async (credentials: any) => {
    // For now, retaining a simple hardcoded auth to avoid breaking the login flow.
    // In the future, this should be replaced with `supabase.auth.signInWithPassword`.
    if (credentials.username === 'admin' && credentials.password === 'password123') {
      return { success: true, user: { id: '1', username: 'admin', name: 'Administrator' } };
    }
    throw new Error('Username atau password salah.');
  },
  getVisitors: async () => {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  addVisitor: async (visitor: any) => {
    const { data, error } = await supabase
      .from('visitors')
      .insert([{ ...visitor, selected: false }])
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  updateVisitor: async (id: string, visitor: any) => {
    const { data, error } = await supabase
      .from('visitors')
      .update(visitor)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  deleteVisitor: async (id: string) => {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  }
};

