'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Save, Building, Phone, Globe, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AgentSettings() {
    const [formData, setFormData] = useState({
        agency_name: '',
        phone_number: '',
        bio: '',
        cui: '',
        website: ''
    });
    const [userEmail, setUserEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    // Încărcăm datele existente (dacă există)
    useEffect(() => {
        const loadProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if(!session) return;
            setUserEmail(session.user.email || '');

            try {
                const res = await axios.get('http://127.0.0.1:8000/agent/profile', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                if (res.data && res.data.agency_name) {
                    setFormData({
                        agency_name: res.data.agency_name || '',
                        phone_number: res.data.phone_number || '',
                        bio: res.data.bio || '',
                        cui: res.data.cui || '',
                        website: res.data.website || ''
                    });
                }
            } catch (e) { console.log("Profil inexistent momentan."); }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        try {
            await axios.put('http://127.0.0.1:8000/agent/profile', formData, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });
            
            alert("Profil salvat cu succes! Vei fi redirecționat.");
            // Hard Refresh pentru a actualiza Navbar-ul
            window.location.href = '/agent/dashboard'; 
        } catch (e) {
            alert("Eroare la salvare. Verifică conexiunea.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-2xl mx-auto p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-600 p-2 rounded-lg text-white"><Building size={24}/></div>
                    <h1 className="text-2xl font-bold">Profil Agent & Verificare</h1>
                </div>
                
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    
                    {/* INFO BOX */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-900">
                        <ShieldCheck className="shrink-0 text-blue-600" />
                        <div>
                            <strong>Cum primești bifa de "Verificat" ✅ automat?</strong><br/>
                            Sistemul nostru verifică dacă adresa ta de email (<i>{userEmail}</i>) aparține de domeniul site-ului agenției tale.
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Nume Agenție</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-100 transition"
                            placeholder="Ex: Nidus Real Estate"
                            value={formData.agency_name}
                            onChange={e => setFormData({...formData, agency_name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Telefon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18}/>
                                <input 
                                    type="text" 
                                    className="w-full border rounded-lg p-3 pl-10 outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="07xx xxx xxx"
                                    value={formData.phone_number}
                                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">CUI (Fiscal)</label>
                            <input 
                                type="text" 
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="Ex: 12345678"
                                value={formData.cui}
                                onChange={e => setFormData({...formData, cui: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Website Agenție</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 text-gray-400" size={18}/>
                            <input 
                                type="text" 
                                className="w-full border rounded-lg p-3 pl-10 outline-none focus:ring-2 focus:ring-blue-100"
                                placeholder="www.agentia-mea.ro"
                                value={formData.website}
                                onChange={e => setFormData({...formData, website: e.target.value})}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-1">
                            * Asigură-te că emailul tău se termină în domeniul acestui site.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Despre tine (Bio)</label>
                        <textarea 
                            className="w-full border rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="Descrie experiența ta și zonele în care activezi..."
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}
                        />
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition flex justify-center items-center gap-2 shadow-lg shadow-slate-200"
                    >
                        {loading ? 'Se salvează...' : <><Save size={20}/> Salvează Profil & Verifică</>}
                    </button>
                </div>
            </div>
        </div>
    );
}