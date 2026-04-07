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
  updateSupplyHistory: async (id: any, log: any) => {
    const { data, error } = await supabase
      .from('supply_history')
      .update(log)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteSupplyHistory: async (id: any) => {
    const { error } = await supabase
      .from('supply_history')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
  // Stock Opname Session Management
  getOpnameSessions: async () => {
    const { data, error } = await supabase
      .from('stock_opname_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addOpnameSession: async (session: any) => {
    const { data, error } = await supabase
      .from('stock_opname_sessions')
      .insert([session])
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
  getActiveNotifications: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_sent', true)
      .eq('is_read', false)
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
  // ===== DASHBOARD DATA OPTIMIZATION =====
  getDashboardStats: async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Fetch all necessary data in parallel
    const [sales, products, visitors, blastLogs] = await Promise.all([
      api.getSales(),
      api.getProducts(),
      api.getVisitors(),
      api.getBlastLogs()
    ]);

    // 1. Calculate Today's Revenue
    const todaySales = sales.filter((s: any) => s.created_at.startsWith(todayStr));
    const todayRevenue = todaySales.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

    // 2. Revenue Trend (Last 7 Days)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const daySales = sales.filter((s: any) => s.created_at.startsWith(dateStr));
      return {
        date: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        revenue: daySales.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0),
        fullDate: dateStr
      };
    });

    // 3. Top 5 Products (By Frequency in Sales)
    const productFrequency: Record<string, { name: string, count: number }> = {};
    sales.forEach((s: any) => {
      try {
        const items = typeof s.items === 'string' ? JSON.parse(s.items) : s.items;
        items.forEach((item: any) => {
          const name = item.product_name || item.name;
          if (!productFrequency[name]) productFrequency[name] = { name, count: 0 };
          productFrequency[name].count += item.quantity || 1;
        });
      } catch (e) {}
    });
    const topProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Stock Summary
    const lowStockCount = products.filter((p: any) => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
    const outOfStockCount = products.filter((p: any) => (p.stock || 0) === 0).length;

    // 5. Recent Items for Feed
    const recentSales = sales.slice(0, 5).map(s => ({
      type: 'sale',
      title: `Transaksi Baru (Rp ${s.total_amount.toLocaleString()})`,
      time: s.created_at,
      payment: s.payment_method
    }));

    return {
      metrics: {
        todayRevenue,
        totalCustomers: visitors.length,
        lowStockCount,
        outOfStockCount,
        totalReach: blastLogs.reduce((acc: number, curr: any) => acc + (curr.recipient_count || 0), 0),
        totalCatalogues: (await api.getCatalogues()).length
      },
      charts: {
        revenueTrend: last7Days,
        topProducts
      },
      recentSales
    };
  },
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

