'use client';
import { useState, useEffect } from 'react'; 
import { createPortal } from 'react-dom'; 
import { X, Upload, CheckCircle, FileText } from 'lucide-react';
import axios from 'axios';
import { createClient } from '../../utils/supabase/client';

interface ClaimModalProps {
    listingId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ClaimModal({ listingId, isOpen, onClose }: ClaimModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // State pentru a ne asigura că suntem pe client (Next.js SSR fix)
    const [mounted, setMounted] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Resetăm starea când se închide modalul
    useEffect(() => {
        if (!isOpen) {
            setSuccess(false);
            setFile(null);
            setPhone("");
        }
    }, [isOpen]);

    // Dacă nu e deschis sau nu e montat pe client, nu randăm nimic
    if (!isOpen || !mounted) return null;

    const handleSubmit = async () => {
        if (!file || !phone) {
            alert("Te rugăm să completezi telefonul și să încarci un document.");
            return;
        }
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // 1. Upload în Bucket-ul 'claim-documents' (Privat)
            const filePath = `${session.user.id}/${Date.now()}_${file.name}`; // Aceasta este CALEA
            
            const { error: uploadError } = await supabase.storage
                .from('claim-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // --- MODIFICARE AICI ---
            // NU mai cerem getPublicUrl.
            // Trimitem direct 'filePath' la backend.
            
            await axios.post(
                `http://127.0.0.1:8000/listings/${listingId}/claim`,
                { 
                    proof_document_url: filePath, // Trimitem calea: "user_id/timestamp_nume.pdf"
                    contact_info: phone 
                },
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );

            setSuccess(true);
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.detail) {
                alert(error.response.data.detail);
            } else {
                alert("Eroare la trimitere.");
            }
        } finally {
            setLoading(false);
        }
    };

    // --- SOLUȚIA CU PORTAL ---
    // Mutăm acest HTML direct în <body>, scotându-l din sidebar
    return createPortal(
        <div 
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose} // Dacă dai click pe fundal, se închide
        >
            {/* stopPropagation e vital: Click pe modal NU trebuie să închidă modalul */}
            <div 
                className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-100 rounded-full transition"
                >
                    <X size={20} />
                </button>

                {success ? (
                    <div className="text-center py-8">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Cerere Trimisă!</h3>
                        <p className="text-gray-500 mb-6 text-sm">
                            Un administrator va verifica documentele. Vei fi notificat pe telefonul <b>{phone}</b>.
                        </p>
                        <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                            Închide
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Revendică Proprietatea</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Încarcă o dovadă (Factură utilități / Extras CF) pentru a prelua administrarea acestui anunț.
                        </p>

                        <div className="space-y-4">
                            {/* Input Telefon */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Telefon Contact</label>
                                <input 
                                    type="text" 
                                    placeholder="07xx xxx xxx"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                                />
                            </div>

                            {/* Upload Zona */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative bg-slate-50">
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2 text-gray-500">
                                    {file ? (
                                        <>
                                            <FileText size={32} className="text-blue-600" />
                                            <span className="text-blue-600 font-bold text-sm truncate max-w-50">{file.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={32} />
                                            <span className="text-sm font-medium">Încarcă Document</span>
                                            <span className="text-xs text-gray-400">(.jpg, .png, .pdf)</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full py-3 rounded-lg font-bold text-white transition shadow-md ${loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Se trimite...
                                    </div>
                                ) : 'Trimite spre Verificare'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body // <--- Aici este secretul: randăm direct în BODY
    );
}