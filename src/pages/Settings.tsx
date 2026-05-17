import React, { useState, useEffect } from 'react';
import { Save, User, Key, Eye, EyeOff, Loader2, UserPlus, Users, X, Pencil, Trash2 } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import Select from '../components/ui/Select';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'kasir', label: 'Kasir' },
];

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newUser, setNewUser] = useState({ username: '', nickname: '', role: 'kasir', password: 'password123' });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UserProfile>({ username: '', nickname: '', role: 'kasir' });
  const [isUpdatingOtherUser, setIsUpdatingOtherUser] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'profile_update' | 'add_new' | 'edit_other' | 'delete' | null; title: string; message: string; targetId?: string }>({ isOpen: false, type: null, title: '', message: '' });

  const isAdmin = userProfile.role?.toLowerCase().includes('admin');

  useEffect(() => { setFormData(userProfile); }, [userProfile]);
  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  const fetchUsers = async () => { try { setUsers(await api.getUsers(userProfile.company_id!)); } catch {} };

  const handleChange = (field: keyof UserProfile, value: string) => { setFormData(prev => ({ ...prev, [field]: value })); setIsSaved(false); };

  const handleSave = () => { setConfirmModal({ isOpen: true, type: 'profile_update', title: 'Update profil?', message: 'Simpan perubahan profil Anda?' }); };

  const executeUpdateProfile = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!userProfile.id) { onUpdateProfile(formData); setIsSaved(true); toast.success('Profil diperbarui'); setTimeout(() => setIsSaved(false), 3000); return; }
    try { setIsLoading(true); const updated = await api.updateProfile(userProfile.id, { username: formData.username, nickname: formData.nickname, role: formData.role, password: formData.password }); onUpdateProfile(updated); setIsSaved(true); toast.success('Profil diperbarui'); setTimeout(() => setIsSaved(false), 3000); }
    catch { toast.error('Gagal memperbarui profil'); } finally { setIsLoading(false); }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.nickname) { toast.error('Nickname dan username wajib diisi'); return; }
    setConfirmModal({ isOpen: true, type: 'add_new', title: 'Daftarkan pengguna?', message: `Daftarkan ${newUser.nickname} sebagai anggota tim?` });
  };

  const executeAddUser = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try { setIsAddingUser(true); await api.addUser({ ...newUser, company_id: userProfile.company_id }); toast.success(`${newUser.nickname} terdaftar`); setNewUser({ username: '', nickname: '', role: 'kasir', password: 'password123' }); fetchUsers(); }
    catch { toast.error('Pendaftaran gagal'); } finally { setIsAddingUser(false); }
  };

  const handleEditOtherUser = (user: UserProfile) => { setEditingUser(user); setEditFormData({ username: user.username, nickname: user.nickname, role: user.role, password: '' }); setIsEditModalOpen(true); };

  const handleEditOtherUserRequest = () => {
    if (!editFormData.username || !editFormData.nickname) { toast.error('Data tidak boleh kosong'); return; }
    setConfirmModal({ isOpen: true, type: 'edit_other', title: 'Simpan perubahan?', message: `Perbarui data ${editFormData.nickname}?` });
  };

  const executeEditOtherUser = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!editingUser?.id) return;
    try { setIsUpdatingOtherUser(true); await api.updateProfile(editingUser.id, editFormData); toast.success('Data diperbarui'); setIsEditModalOpen(false); fetchUsers(); }
    catch { toast.error('Gagal memperbarui'); } finally { setIsUpdatingOtherUser(false); }
  };

  const handleDeleteUser = (user: UserProfile) => {
    if (user.id === userProfile.id) { toast.error('Tidak bisa menghapus akun sendiri'); return; }
    setConfirmModal({ isOpen: true, type: 'delete', title: 'Hapus pengguna?', message: `Hapus ${user.nickname}? Aksi ini tidak dapat dibatalkan.`, targetId: user.id });
  };

  const executeDeleteUser = async () => {
    const id = confirmModal.targetId;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (!id) return;
    try { await api.deleteUser(id, userProfile.company_id!); toast.success('Pengguna dihapus'); fetchUsers(); }
    catch { toast.error('Gagal menghapus'); }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{isAdmin ? 'Pengaturan Akun & Tim' : 'Pengaturan Akun'}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{isAdmin ? 'Kelola profil dan akses pengguna.' : 'Atur keamanan akun Anda.'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 dark:text-stone-400"><User className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Profil Saya</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Informasi personal</p>
                </div>
              </div>
              <button onClick={handleSave} disabled={isLoading} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaved ? 'Tersimpan' : 'Simpan'}
              </button>
            </div>

            <div className="p-5 space-y-4">
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nama panggilan</label>
                    <input type="text" value={formData.nickname} onChange={e => handleChange('nickname', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Username</label>
                      <input type="text" value={formData.username} onChange={e => handleChange('username', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Role</label>
                      <input type="text" value={formData.role === 'admin' ? 'Administrator' : formData.role} disabled className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-400 dark:text-stone-500 cursor-not-allowed" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password baru</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} placeholder="Masukkan password baru..." className="w-full px-3 py-2 pr-10 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
            </div>
          </div>

          {/* User Directory */}
          {isAdmin && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Tim ({users.length})</h3>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                    <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Nama</th>
                    <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Username</th>
                    <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Role</th>
                    <th className="px-5 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors group">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{u.nickname}</p>
                        {u.id === userProfile.id && <p className="text-xs text-emerald-600 dark:text-emerald-400">Anda</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-stone-500 dark:text-stone-400 font-mono">{u.username}</td>
                      <td className="px-5 py-3"><span className="text-xs font-medium text-stone-600 dark:text-stone-300 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded">{u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Manager' : 'Kasir'}</span></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.role !== 'admin' && <button onClick={() => handleEditOtherUser(u)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>}
                          {u.id !== userProfile.id && <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        {isAdmin ? (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-5">
              <UserPlus className="w-4 h-4 text-stone-400 dark:text-stone-500" />
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Tambah anggota</h3>
            </div>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nickname</label>
                <input type="text" value={newUser.nickname} onChange={e => setNewUser({...newUser, nickname: e.target.value})} placeholder="Nama panggilan" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Username</label>
                <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} placeholder="username_login" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Role</label>
                <Select
                  value={newUser.role}
                  onChange={v => setNewUser({ ...newUser, role: v })}
                  options={ROLE_OPTIONS}
                  className="w-full"
                  buttonClassName="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Password</label>
                <div className="relative">
                  <input type={showNewUserPassword ? "text" : "password"} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 pr-10 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                  <button type="button" onClick={() => setShowNewUserPassword(!showNewUserPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">{showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <button type="submit" disabled={isAddingUser} className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 mt-2">{isAddingUser ? 'Mendaftarkan...' : 'Daftarkan'}</button>
            </form>
          </div>
        ) : (
          <div className="bg-stone-100 dark:bg-stone-800 rounded-lg p-5 border border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-2">Akses terbatas</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">Anda masuk sebagai <strong>{userProfile.role}</strong>. Hubungi administrator untuk perubahan akses.</p>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 z-10">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{confirmModal.message}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={confirmModal.type === 'profile_update' ? executeUpdateProfile : confirmModal.type === 'add_new' ? executeAddUser : confirmModal.type === 'edit_other' ? executeEditOtherUser : executeDeleteUser} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", confirmModal.type === 'delete' ? "bg-red-600 text-white hover:bg-red-700" : "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200")}>{confirmModal.type === 'delete' ? 'Hapus' : 'Lanjutkan'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Edit anggota</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nickname</label><input type="text" value={editFormData.nickname} onChange={e => setEditFormData({...editFormData, nickname: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" /></div>
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Username</label><input type="text" value={editFormData.username} onChange={e => setEditFormData({...editFormData, username: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" /></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Role</label>
                  <Select
                    value={editFormData.role || 'kasir'}
                    onChange={v => setEditFormData({ ...editFormData, role: v })}
                    options={ROLE_OPTIONS}
                    className="w-full"
                    buttonClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Password baru</label>
                  <div className="relative">
                    <input type={showEditPassword ? "text" : "password"} value={editFormData.password || ''} onChange={e => setEditFormData({...editFormData, password: e.target.value})} placeholder="Kosongkan jika tidak diubah" className="w-full px-3 py-2 pr-10 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                    <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">{showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={handleEditOtherUserRequest} disabled={isUpdatingOtherUser} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50">{isUpdatingOtherUser ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
