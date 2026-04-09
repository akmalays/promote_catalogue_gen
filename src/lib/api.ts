import { supabase } from './supabase';

export const api = {
  login: async (credentials: any) => {
    let email = credentials.username;

    // 1. Jika input bukan email (tidak ada @), coba cari email aslinya dari tabel users
    if (!email.includes('@')) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('username', credentials.username)
        .single();
      
      if (userError || !userData) {
        throw new Error('Username tidak ditemukan.');
      }
      throw new Error('Silakan gunakan Email untuk login (Username login sedang dalam pemeliharaan).');
    }

    // 2. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: credentials.password
    });

    if (authError) {
      throw new Error('Email atau password salah.');
    }

    // 2. Fetch the full profile including company info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('id', authData.user?.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('Profil tidak ditemukan.');
    }

    return { success: true, user: userProfile };
  },
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) throw error;
    return { success: true };
  },
  signup: async (details: { 
    companyName: string; 
    email: string; 
    username: string; 
    nickname: string; 
    password: string;
  }) => {
    // 1. Create Company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ 
        name: details.companyName, 
        email: details.email,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError) throw companyError;

    // 2. Create Auth User (Trigger will automatically create public.users profile)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: details.email,
      password: details.password,
      options: {
        data: {
          username: details.username,
          company_id: company.id,
          role: 'admin',
          nickname: details.nickname
        }
      }
    });

    if (authError) {
      await supabase.from('companies').delete().eq('id', company.id);
      throw authError;
    }

    // 3. Create Public Profile (Kita kembalikan manual agar Role Admin terpaku dengan benar)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user?.id,
        company_id: company.id,
        username: details.username,
        nickname: details.nickname,
        role: 'admin', // <--- Memastikan role adalah Admin
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) {
      // Jika profil gagal, kita bersihkan auth & company agar tidak sisa data rusak
      await supabase.from('companies').delete().eq('id', company.id);
      console.error('Error creating profile:', userError);
      throw new Error('Gagal membuat profil admin. Silakan coba lagi.');
    }

    return { success: true, user: { ...user, company }, company };
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
  getUsers: async (companyId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
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
  deleteUser: async (id: string, companyId: string) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
      
    if (error) throw error;
    return true;
  },
  getVisitors: async (companyId: string) => {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('company_id', companyId)
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
      .eq('company_id', visitor.company_id)
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  deleteVisitor: async (id: string, companyId: string) => {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
      
    if (error) throw error;
    return { success: true };
  },
  saveCatalogue: async (catalogue: { name: string, data: any, creator_name: string, company_id: string, thumbnail?: string }) => {
    const { data, error } = await supabase
      .from('catalogues')
      .insert([{
        name: catalogue.name,
        catalog_data: catalogue.data,
        creator_name: catalogue.creator_name,
        company_id: catalogue.company_id,
        thumbnail: catalogue.thumbnail,
        created_at: new Date().toISOString()
      }])
      .select();
    if (error) throw error;
    return data?.[0];
  },
  updateCatalogue: async (id: any, catalogue: { name: string, data: any, thumbnail?: string, creator_name?: string, company_id?: string }) => {
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
        creator_name: catalogue.creator_name,
        company_id: (catalogue as any).company_id // Ensure company_id is passed if available
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
  getCatalogues: async (companyId: string) => {
    const { data, error } = await supabase
      .from('catalogues')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  deleteCatalogueFromDB: async (id: string, companyId: string) => {
    const { error } = await supabase
      .from('catalogues')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
    return { success: true };
  },

  // Blast Activity History tracking
  saveBlastHistory: async (history: { promo_name: string; sender_name: string; recipient_count: number; company_id: string; catalogue_preview?: string }) => {
    const { error } = await supabase.from('blast_history').insert([
      { 
        promo_name: history.promo_name, 
        sender_name: history.sender_name, 
        recipient_count: history.recipient_count,
        company_id: history.company_id,
        catalogue_preview: history.catalogue_preview
      }
    ]);
    if (error) throw error;
    return { success: true };
  },
  getBlastLogs: async (companyId: string) => {
    const { data, error } = await supabase
      .from('blast_history')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Product Database Management
  getProducts: async (companyId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
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
      .eq('company_id', product.company_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  decrementStock: async (id: string, quantity: number, companyId: string) => {
    const { error } = await supabase.rpc('decrement_stock', {
      p_id: id,
      p_quantity: quantity,
      p_company_id: companyId
    });
    if (error) throw error;
    return true;
  },
  incrementStock: async (id: string, quantity: number, companyId: string) => {
    const { error } = await supabase.rpc('increment_stock', {
      p_id: id,
      p_quantity: quantity,
      p_company_id: companyId
    });
    if (error) throw error;
    return true;
  },
  processInbound: async (details: {
    product_id: string;
    quantity: number;
    purchase_price: number;
    company_id: string;
    supplier?: string;
    salesman?: string;
    invoice_image?: string | null;
  }) => {
    // 1. Get current product to calculate moving average
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, cost_price')
      .eq('id', details.product_id)
      .eq('company_id', details.company_id)
      .single();

    if (fetchError) throw fetchError;

    const currentStock = Number(product.stock || 0);
    const currentCost = Number(product.cost_price || 0);
    const newQty = Number(details.quantity);
    const newPurchasePrice = Number(details.purchase_price);

    // Moving Average Formula
    const totalStock = currentStock + newQty;
    let newCostPrice = newPurchasePrice;
    
    if (currentStock > 0 && totalStock > 0) {
      newCostPrice = ((currentStock * currentCost) + (newQty * newPurchasePrice)) / totalStock;
    }

    // 2. Update Product (Stock & Cost Price)
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        stock: totalStock,
        cost_price: Math.round(newCostPrice)
      })
      .eq('id', details.product_id)
      .eq('company_id', details.company_id);

    if (updateError) throw updateError;

    // 3. Add to Supply History
    return api.addSupplyHistory({
      product_id: details.product_id,
      quantity: details.quantity,
      purchase_price: details.purchase_price,
      company_id: details.company_id,
      supplier: details.supplier,
      salesman: details.salesman,
      invoice_image: details.invoice_image,
      created_at: new Date().toISOString()
    });
  },
  deleteProduct: async (id: any, companyId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
    return true;
  },
  // Supply History Management
  getSupplyHistory: async (companyId: string) => {
    const { data, error } = await supabase
      .from('supply_history')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  addSupplyHistory: async (log: any) => {
    const { data, error } = await supabase
      .from('supply_history')
      .insert([{
        ...log,
        purchase_price: Number(log.purchase_price || 0)
      }])
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
      .eq('company_id', log.company_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteSupplyHistory: async (id: any, companyId: string) => {
    const { error } = await supabase
      .from('supply_history')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
    return true;
  },
  // Stock Opname Session Management
  getOpnameSessions: async (companyId: string) => {
    const { data, error } = await supabase
      .from('stock_opname_sessions')
      .select('*')
      .eq('company_id', companyId)
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
  getSales: async (companyId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // ===== NOTIFICATIONS =====
  getNotifications: async (companyId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  getActiveNotifications: async (companyId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
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
      .eq('company_id', updates.company_id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  deleteNotification: async (id: any, companyId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) throw error;
    return true;
  },
  markNotificationRead: async (id: any, companyId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  markAllNotificationsRead: async (companyId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('company_id', companyId)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  },
  // Scheduler: Get pending scheduled notifications that are due
  getScheduledDueNotifications: async (companyId: string) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_sent', false)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  // Mark scheduled notification as sent
  markNotificationSent: async (id: any, companyId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_sent: true, sent_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // ===== DASHBOARD DATA OPTIMIZATION =====
  getDashboardStats: async (companyId: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Fetch all necessary data in parallel
    const [sales, products, visitors, blastLogs] = await Promise.all([
      api.getSales(companyId),
      api.getProducts(companyId),
      api.getVisitors(companyId),
      api.getBlastLogs(companyId)
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
        totalCatalogues: (await api.getCatalogues(companyId)).length
      },
      charts: {
        revenueTrend: last7Days,
        topProducts
      },
      recentSales
    };
  },
  // ===== STORE SETTINGS (TARGETS & FOCUS ITEMS) =====
  getStoreSettings: async (companyId: string) => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('company_id', companyId);
    if (error) throw error;
    
    // Convert to a more usable object
    return data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  },
  updateStoreSetting: async (companyId: string, key: string, value: any) => {
    const { data, error } = await supabase
      .from('store_settings')
      .upsert({ 
        company_id: companyId,
        key, 
        value, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'company_id,key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

