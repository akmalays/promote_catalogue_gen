import React, { useState, useEffect } from 'react';
import { Save, User, UserCircle, Key, Shield, Eye, EyeOff, Loader2, UserPlus, Users, BadgeCheck, AlertCircle, X, Check, Pencil, Trash2 } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function Settings({ userProfile, onUpdateProfile }: SettingsProps) {
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // User Management State (Admins only)
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', nickname: '', role: 'editor', password: 'password123' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UserProfile>({ username: '', nickname: '', role: 'kasir' });
  const [isUpdatingOtherUser, setIsUpdatingOtherUser] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'profile_update' | 'add_new' | 'edit_other' | 'delete' | null;
    title: string;
    message: string;
    targetId?: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    message: ''
  });

  const isAdmin = userProfile.role?.toLowerCase().includes('admin');

  // Sync when prop changes
  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  // Fetch users if admin
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setIsFetchingUsers(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Gagal mengambil daftar user:', err);
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    setConfirmModal({
      isOpen: true,
      type: 'profile_update',
      title: 'Update Profil?',
      message: 'Apakah Anda yakin ingin memperbarui informasi profil Anda saat ini?'
    });
  };

  const executeUpdateProfile = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    if (!userProfile.id) {
      onUpdateProfile(formData);
      setIsSaved(true);
      toast.success('✅ Profil berhasil diperbarui secara lokal!');
      setTimeout(() => setIsSaved(false), 3000);
      return;
    }

    try {
      setIsLoading(true);
      const updated = await api.updateProfile(userProfile.id, {
        username: formData.username,
        nickname: formData.nickname,
        role: formData.role,
        password: formData.password
      });
      onUpdateProfile(updated);
      setIsSaved(true);
      toast.success('✨ Profil berhasil diperbarui di Cloud!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Gagal update profil:', err);
      toast.error('❌ Gagal memperbarui profil. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.nickname) {
      toast.error('⚠️ Nickname dan Username wajib diisi!');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'add_new',
      title: 'Daftarkan Pengguna?',
      message: `Daftarkan ${newUser.nickname} sebagai anggota tim baru?`
    });
  };

  const executeAddUser = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      setIsAddingUser(true);
      await api.addUser(newUser);
      toast.success(`🚀 ${newUser.nickname} berhasil terdaftar!`);
      setNewUser({ username: '', nickname: '', role: 'editor', password: 'password123' });
      fetchUsers();
    } catch (err: any) {
      console.error('Gagal tambah user:', err);
      toast.error('❌ Pendaftaran gagal. Username mungkin sudah terpakai.');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleEditOtherUserRequest = () => {
    if (!editFormData.username || !editFormData.nickname) {
      toast.error('⚠️ Data tidak boleh kosong!');
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'edit_other',
      title: 'Simpan Perubahan?',
      message: `Simpan pembaruan data untuk ${editFormData.nickname}?`
    });
  };

  const executeEditOtherUser = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!editingUser?.id) return;

    try {
      setIsUpdatingOtherUser(true);
      await api.updateProfile(editingUser.id, editFormData);
      toast.success(`✨ Data ${editFormData.nickname} diperbarui!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Gagal update user:', err);
      toast.error('❌ Gagal memperbarui data user.');
    } finally {
      setIsUpdatingOtherUser(false);
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === userProfile.id) {
      toast.error('🚫 Anda tidak bisa menghapus akun Anda sendiri!');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Hapus Pengguna?',
      message: `Apakah Anda yakin ingin menghapus ${user.nickname}? Aksi ini tidak dapat dibatalkan.`,
      targetId: user.id
    });
  };

  const executeDeleteUser = async () => {
    const id = confirmModal.targetId;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    if (!id) return;

    try {
      await api.deleteUser(id);
      toast.success('🗑️ Pengguna telah dihapus');
      fetchUsers();
    } catch (err) {
      console.error('Gagal hapus user:', err);
      toast.error('❌ Gagal menghapus pengguna');
    }
  };

  const handleEditOtherUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      password: user.password || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateOtherUserRole = async (userId: string, newRole: string) => {
    try {
      await api.updateProfile(userId, { role: newRole });
      toast.success('✅ Peran user diperbarui');
      fetchUsers();
    } catch (err) {
      console.error('Gagal update role:', err);
      toast.error('❌ Gagal mengubah peran');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-12 max-w-6xl mx-auto custom-scrollbar pb-24">
      {/* Header */}
      <div className="flex flex-col mb-12 px-2">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-[#8b7365]" />
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            {isAdmin ? 'Account & Team Settings' : 'Account Security'}
          </h1>
        </div>
        <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">
          {isAdmin 
            ? 'Kelola profil pribadi Anda dan manajemen akses pengguna aplikasi.' 
            : 'Atur keamanan akun dan kata sandi Anda untuk perlindungan data.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: My Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-[#8b7365]/10 flex items-center justify-center rounded-xl text-[#8b7365]">
                    <UserCircle className="w-8 h-8" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-800 uppercase tracking-tighter">Profil Saya</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Informasi Personal</p>
                 </div>
               </div>
               <button 
                 onClick={handleSave}
                 disabled={isLoading}
                 className="bg-[#8b7365] text-white px-5 py-2.5 rounded-xl hover:bg-[#725e52] transition flex items-center gap-2 font-bold shadow-sm text-xs disabled:opacity-50"
               >
                 {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 {isSaved ? 'Tersimpan!' : isLoading ? 'Menyimpan...' : 'Update Profil'}
               </button>
            </div>

            <div className="p-8 space-y-6">
              {isAdmin && (
                <>
                  {/* Nickname */}
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Nama Panggilan (Nickname)</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={formData.nickname}
                        onChange={e => handleChange('nickname', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#f8f9fb] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b7365]/30 focus:border-[#8b7365] text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Username Login</label>
                      <div className="relative">
                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={formData.username}
                          onChange={e => handleChange('username', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#f8f9fb] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b7365]/30 focus:border-[#8b7365] text-sm font-medium transition-all"
                        />
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Peran (Role)</label>
                      <div className="relative">
                        <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="text" 
                          value={formData.role === 'admin' ? 'Administrator' : formData.role}
                          disabled
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl focus:outline-none text-sm font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Ganti Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password || ''}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Masukkan password baru..."
                    className="w-full pl-10 pr-10 py-3 bg-[#f8f9fb] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8b7365]/30 focus:border-[#8b7365] text-sm font-medium transition-all"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User Directory - Admin Only */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-[#8b7365]" />
                    <h3 className="font-bold text-slate-800 uppercase tracking-tighter">Direktori Pengguna</h3>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">{users.length} Total</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50/50">
                     <tr>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nickname</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</th>
                       <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Peran (Role)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {users.map(u => (
                       <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm">{u.nickname}</span>
                              {u.id === userProfile.id && <span className="text-[9px] font-black uppercase text-emerald-600">Anda (Sedang Login)</span>}
                            </div>
                         </td>
                         <td className="px-6 py-4 text-xs font-mono text-slate-500">{u.username}</td>
                         <td className="px-6 py-4">
                             <div className="flex items-center justify-between gap-4">
                               <span className="text-xs font-bold text-[#8b7365] px-2 py-1 bg-slate-100 rounded-lg">
                                  {u.role === 'admin' ? 'Administrator' : u.role === 'manager' ? 'Manager' : 'Kasir'}
                               </span>

                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => handleEditOtherUser(u)}
                                   className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                   title="Edit Data"
                                 >
                                   <Pencil className="w-3.5 h-3.5" />
                                 </button>
                                 {u.id !== userProfile.id && (
                                   <button 
                                     onClick={() => handleDeleteUser(u)}
                                     className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                     title="Hapus User"
                                   >
                                     <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                              </div>
                            </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>

        {/* Right: Add User Sidebar - Admin Only */}
        {isAdmin && (
          <div className="bg-[#8b7365] rounded-3xl p-8 text-white shadow-xl shadow-[#8b7365]/20 sticky top-24">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                   <UserPlus className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="font-bold text-lg leading-tight uppercase tracking-tighter">Tambah Anggota Baru</h3>
                   <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase">Pendaftaran Tim</p>
                </div>
             </div>
             
             <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1.5 block">Nickname</label>
                   <input 
                     type="text" 
                     value={newUser.nickname}
                     onChange={e => setNewUser({...newUser, nickname: e.target.value})}
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                     placeholder="Misal: Budi Budiman"
                   />
                </div>
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1.5 block">Username</label>
                   <input 
                     type="text" 
                     value={newUser.username}
                     onChange={e => setNewUser({...newUser, username: e.target.value})}
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                     placeholder="budi_marketer"
                   />
                </div>
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1.5 block">Peran</label>
                   <select 
                     value={newUser.role}
                     onChange={e => setNewUser({...newUser, role: e.target.value})}
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 appearance-none"
                   >
                      <option value="admin" className="text-slate-800">Administrator</option>
                      <option value="manager" className="text-slate-800">Manager</option>
                      <option value="kasir" className="text-slate-800">Kasir</option>
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1.5 block">Password</label>
                   <div className="relative">
                     <input 
                       type={showNewUserPassword ? "text" : "password"} 
                       value={newUser.password}
                       onChange={e => setNewUser({...newUser, password: e.target.value})}
                       className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/40 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 pr-10"
                     />
                     <button 
                       type="button"
                       onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                       className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                     >
                        {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={isAddingUser}
                  className="w-full bg-white text-[#8b7365] font-black uppercase text-xs tracking-widest py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-lg shadow-black/10 mt-4 disabled:opacity-50"
                >
                  {isAddingUser ? 'Mendaftarkan...' : 'Daftarkan Pengguna'}
                </button>
             </form>
          </div>
        )}

        {/* Info Card - Non-Admin */}
        {!isAdmin && (
           <div className="bg-slate-100 rounded-3xl p-8 border border-slate-200">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8b7365] mb-4 shadow-sm">
                 <BadgeCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Akses Terbatas</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium"> 
                Anda masuk sebagai <strong>{userProfile.role}</strong>. Anda hanya dapat mengubah informasi tampilan personal dan keamanan akun. 
                <br /><br />
                Hubungi Administrator untuk perubahan username atau peningkatan peran akses.
              </p>
           </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 z-10"
            >
               <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
                  <AlertCircle className="w-8 h-8" />
               </div>
               
               <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-3">
                 {confirmModal.title}
               </h3>
               <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
                 {confirmModal.message}
               </p>
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                   className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                   Batal
                 </button>
                 <button 
                   onClick={
                     confirmModal.type === 'profile_update' ? executeUpdateProfile : 
                     confirmModal.type === 'add_new' ? executeAddUser : 
                     confirmModal.type === 'edit_other' ? executeEditOtherUser :
                     executeDeleteUser
                   }
                   className={cn(
                     "flex-1 py-3.5 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl",
                     confirmModal.type === 'delete' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-[#8b7365] hover:bg-[#7a6458] shadow-[#8b7365]/20"
                   )}
                 >
                   {confirmModal.type === 'delete' ? 'Ya, Hapus' : 'Ya, Lanjutkan'}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal Popup */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsEditModalOpen(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col z-10"
            >
               {/* Modal Header */}
               <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365]">
                       <Pencil className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Edit Anggota Tim</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Perbarui Akses & Informasi</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                  >
                    <X className="w-6 h-6" />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="p-8 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Nickname</label>
                        <input 
                          type="text" 
                          value={editFormData.nickname}
                          onChange={e => setEditFormData({...editFormData, nickname: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Username</label>
                        <input 
                          type="text" 
                          value={editFormData.username}
                          onChange={e => setEditFormData({...editFormData, username: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Peran (Role)</label>
                     <select 
                       value={editFormData.role}
                       onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all appearance-none"
                     >
                        <option value="admin">Administrator</option>
                        <option value="manager">Manager</option>
                        <option value="kasir">Kasir</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Ganti Password</label>
                     <div className="relative">
                        <input 
                          type={showEditPassword ? "text" : "password"} 
                          value={editFormData.password || ''}
                          onChange={e => setEditFormData({...editFormData, password: e.target.value})}
                          placeholder="••••••••"
                          className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                           {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                     </div>
                  </div>
               </div>

               {/* Modal Footer */}
               <div className="p-8 border-t border-slate-50 bg-slate-50/10 flex gap-4">
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleEditOtherUserRequest}
                    disabled={isUpdatingOtherUser}
                    className="flex-1 py-4 bg-[#8b7365] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/20 disabled:opacity-50"
                  >
                    {isUpdatingOtherUser ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
