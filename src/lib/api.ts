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
  deleteUser: async (id: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
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
      .select();
    if (error) throw error;
    return data?.[0];
  },
  updateCatalogue: async (id: any, catalogue: { name: string, data: any, thumbnail?: string, creator_name?: string }) => {
    // Force ID to number if it looks like one, to avoid Postgres type mismatch
    const cleanId = (!isNaN(Number(id)) && typeof id !== 'boolean') ? Number(id) : id;
    console.log('Upserting catalogue with clean ID:', cleanId, typeof cleanId);
    
    const { data, error } = await supabase
      .from('catalogues')
      .upsert({
        id: cleanId,
        name: catalogue.name,
        catalog_data: catalogue.data,
        thumbnail: catalogue.thumbnail,
        creator_name: catalogue.creator_name
      }, { onConflict: 'id' })
      .select();
      
    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('Gagal menyinkronkan data ke cloud. Coba simpan sebagai draf baru.');
    }
    
    return data[0];
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
  },

  // Product Database Management
  getProducts: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addProduct: async (product: any) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateProduct: async (id: any, product: any) => {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteProduct: async (id: any) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  // Supply History Management
  getSupplyHistory: async () => {
    const { data, error } = await supabase
      .from('supply_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addSupplyHistory: async (log: any) => {
    const { data, error } = await supabase
      .from('supply_history')
      .insert([log])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // Sales & POS Management
  addSale: async (sale: any) => {
    const { data, error } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  getSales: async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ===== NOTIFICATIONS =====
  getNotifications: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addNotification: async (notification: {
    title: string;
    message: string;
    type: 'info' | 'promo' | 'warning' | 'success';
    scheduled_at?: string | null;
    target_role?: string;
    sender_name?: string;
  }) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        is_read: false,
        is_sent: !notification.scheduled_at, // If no schedule, mark as sent immediately
        sent_at: !notification.scheduled_at ? new Date().toISOString() : null,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateNotification: async (id: any, updates: any) => {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteNotification: async (id: any) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  markNotificationRead: async (id: any) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  markAllNotificationsRead: async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (error) throw error;
    return true;
  },
  // Scheduler: Get pending scheduled notifications that are due
  getScheduledDueNotifications: async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', false)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  // Mark scheduled notification as sent
  markNotificationSent: async (id: any) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // Get only active (sent & unread) notifications for popup
  // ===== STORE SETTINGS (TARGETS & FOCUS ITEMS) =====
  getStoreSettings: async () => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*');
    if (error) throw error;
    
    // Convert to a more usable object
    return data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  },
  updateStoreSetting: async (key: string, value: any) => {
    const { data, error } = await supabase
      .from('store_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
