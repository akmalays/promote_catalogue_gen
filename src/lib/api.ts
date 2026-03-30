import { supabase } from './supabase';

export const api = {
  login: async (credentials: any) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', credentials.username)
      .eq('password', credentials.password)
      .single();
    
    if (error || !data) {
      throw new Error('Username atau password salah.');
    }
    
    return { success: true, user: data };
  },
  updateProfile: async (id: string, profile: any) => {
    const { data, error } = await supabase
      .from('users')
      .update(profile)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  getUsers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },
  addUser: async (user: any) => {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();
      
    if (error) throw error;
    return data;
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
  },
  saveCatalogue: async (catalogue: { name: string, data: any, creator_name: string, thumbnail?: string }) => {
    const { data, error } = await supabase
      .from('catalogues')
      .insert([{
        name: catalogue.name,
        catalog_data: catalogue.data,
        creator_name: catalogue.creator_name,
        thumbnail: catalogue.thumbnail,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  getCatalogues: async () => {
    const { data, error } = await supabase
      .from('catalogues')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  deleteCatalogueFromDB: async (id: string) => {
    const { error } = await supabase
      .from('catalogues')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  // Blast Activity History tracking
  saveBlastHistory: async (history: { promo_name: string; sender_name: string; recipient_count: number; catalogue_preview?: string }) => {
    const { error } = await supabase.from('blast_history').insert([
      { 
        promo_name: history.promo_name, 
        sender_name: history.sender_name, 
        recipient_count: history.recipient_count,
        catalogue_preview: history.catalogue_preview
      }
    ]);
    if (error) throw error;
    return { success: true };
  },

  getBlastLogs: async () => {
    const { data, error } = await supabase
      .from('blast_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

