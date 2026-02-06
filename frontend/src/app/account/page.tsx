'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, Mail, Shield, Calendar, Camera, Save, Loader2, Phone } from 'lucide-react';

import imageCompression from 'browser-image-compression';
import { createClient } from '../../../utils/supabase/client';
import { toast } from "sonner"

export default function AccountPage() {
    const supabase = createClient();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [phone, setPhone] = useState('');

    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);
            setFullName(user.user_metadata?.full_name || '');
            setPhone(user.user_metadata?.phone || '');
            setAvatarUrl(user.user_metadata?.avatar_url || null);
            setLoading(false);
        };
        getUser();
    }, [router]);

    //FUNCTIA DE UPLOAD 
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setSaving(true);
            setMessage(null);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Selecteaza o imagine.');
            }

            const originalFile = event.target.files[0];

            // CONFIGURARE COMPRESIE
            const options = {
                maxSizeMB: 0.2,          // Maxim 200 KB (foarte putin spatiu!)
                maxWidthOrHeight: 1080,  // Redimensionam la HD (nu ne trebuie 4K pt avatar)
                useWebWorker: true,      // Foloseste procesare paralela pentru viteza
                fileType: 'image/jpeg'   // Convertim totul in JPEG (ocupa mai putin decat PNG)
            };

            // COMPRIMAM IMAGINEA
            const compressedFile = await imageCompression(originalFile, options);

            // Debug: Poti vedea in consola cat ai economisit
            console.log(`Original: ${originalFile.size / 1024 / 1024} MB`);
            console.log(`Comprimat: ${compressedFile.size / 1024 / 1024} MB`);

            const fileExt = 'jpg'; // stim sigur ca e jpg
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // UPLOAD IMAGINE
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, compressedFile); //trimitem compressedFile

            if (uploadError) throw uploadError;

            // Obtine URL-ul public
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Actualizeaza profilul
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success("Fotografia a fost actualizata!")
            router.refresh();

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "A aparut o problema.")
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setSaving(true);
            setMessage(null);

            const { data, error } = await supabase.auth.updateUser({
                data: { 
                    full_name: fullName,
                    phone: phone 
                }
            });

            if (error) throw error;

            if (data.user) {
                setUser(data.user);
                setFullName(data.user.user_metadata.full_name || '');
                setPhone(data.user.user_metadata.phone || '');
            }

            toast.success("Profil actualizat cu succes!");
            router.refresh();

        } catch (error: any) {
            toast.error("Nu am putut actualiza profilul.")
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Se incarca...</div>;

    const joinDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })
        : '-';

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 py-10">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Setari Cont</h1>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-3">

                    <div className="md:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">

                            <div className="relative w-28 h-28 mx-auto mb-4 group">
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-md bg-blue-50">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-blue-600 text-4xl font-bold bg-blue-100">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <button
                                    disabled={saving}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition shadow-sm border-2 border-white"
                                    title="Schimba poza"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            <h2 className="text-lg font-bold text-gray-900 truncate">
                                {fullName || user.email?.split('@')[0]}
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <User size={20} className="text-blue-600" />
                                Date Personale
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nume Complet</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Ex: Ion Popescu"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Ex: 07xx xxx xxx"
                                            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <div className="flex items-center gap-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500 cursor-not-allowed">
                                        <Mail size={16} />
                                        {user.email}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Email-ul nu poate fi schimbat momentan.</p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Salveaza Modificarile
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-orange-500" />
                                Info Cont
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <label className="text-xs text-gray-500 block mb-1">Membru din</label>
                                    <p className="font-semibold text-gray-900">{joinDate}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <label className="text-xs text-gray-500 block mb-1">ID Utilizator</label>
                                    <p className="font-mono text-xs text-gray-600 truncate">{user.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}