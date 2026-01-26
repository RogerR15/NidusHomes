'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft, Upload, MapPin, Home, Image as ImageIcon, X, Loader2, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '../../../utils/supabase/client';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-80 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Se încarcă harta...</div>
});

export default function AddListingPage() {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // State pentru erori
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price_eur: '',
        transaction_type: 'SALE',
        rooms: '',
        sqm: '',
        floor: '', 
        year_built: '',
        neighborhood: '',
        address: '',
        latitude: 47.1585,
        longitude: 27.6014,
    });

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setUserId(session.user.id);
                setLoading(false);
            }
        };
        checkUser();
    }, [router, supabase]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]);
            
            if (errors.images) setErrors(prev => ({ ...prev, images: '' }));
        }
    };

    const removeImage = (index: number) => {
        const newFiles = [...selectedFiles];
        const newUrls = [...previewUrls];
        newFiles.splice(index, 1);
        newUrls.splice(index, 1);
        setSelectedFiles(newFiles);
        setPreviewUrls(newUrls);
    };

    //VALIDARE
    const validateStep = (currentStep: number) => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        // Validare Pas 1
        if (currentStep === 1) {
            if (!formData.neighborhood.trim()) {
                newErrors.neighborhood = 'Te rugăm să introduci un cartier.';
                isValid = false;
            }
        }

        // Validare Pas 2
        if (currentStep === 2) {
            if (!formData.title.trim()) newErrors.title = 'Titlul este obligatoriu.';
            if (!formData.price_eur) newErrors.price_eur = 'Prețul este obligatoriu.';
            if (!formData.sqm) newErrors.sqm = 'Suprafața este obligatorie.';
            if (!formData.rooms) newErrors.rooms = 'Nr. de camere este obligatoriu.';
            
            // NOU: Validare Etaj (permitem 0, dar nu gol)
            if (formData.floor === '') {
                newErrors.floor = 'Etajul este obligatoriu.';
            }

            if (Object.keys(newErrors).length > 0) isValid = false;
        }

        // Validare Pas 3 (Poze)
        if (currentStep === 3) {
            if (selectedFiles.length === 0) {
                newErrors.images = 'Trebuie să adaugi cel puțin o imagine.';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        if (!validateStep(3)) return;

        if (!userId) return;
        setSubmitting(true);

        try {
            const uploadedImageUrls: string[] = [];

            for (const file of selectedFiles) {
                const fileName = `${userId}/${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
                const { error } = await supabase.storage.from('listing-images').upload(fileName, file);
                if (error) continue; 
                const { data: publicUrlData } = supabase.storage.from('listing-images').getPublicUrl(fileName);
                if (publicUrlData.publicUrl) uploadedImageUrls.push(publicUrlData.publicUrl);
            }

            const payload = {
                ...formData,
                price_eur: Number(formData.price_eur),
                rooms: Number(formData.rooms),
                sqm: Number(formData.sqm),
                floor: formData.floor !== '' ? Number(formData.floor) : null,
                year_built: formData.year_built ? Number(formData.year_built) : null,
                images: uploadedImageUrls,
                owner_id: userId
            };

            const { data: { session } } = await supabase.auth.getSession();
            await axios.post('http://127.0.0.1:8000/listings', payload, {
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });

            alert("Anunț publicat cu succes! 🎉");
            router.push('/'); 

        } catch (error) {
            console.error("Eroare:", error);
            alert("A apărut o eroare.");
        } finally {
            setSubmitting(false);
        }
    };

    const ErrorMsg = ({ field }: { field: string }) => {
        return errors[field] ? (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors[field]}
            </p>
        ) : null;
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Se încarcă...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <main className="max-w-3xl mx-auto py-10 px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Adaugă un anunț nou</h1>

                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all duration-300" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>

                        {[
                            { num: 1, icon: MapPin, label: "Locație" },
                            { num: 2, icon: Home, label: "Detalii" },
                            { num: 3, icon: ImageIcon, label: "Foto" }
                        ].map((s) => (
                            <div key={s.num} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.num ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                                    <s.icon size={18} />
                                </div>
                                <span className={`text-xs font-medium ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 min-h-100">

                    {/* LOCATIE */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-gray-800">Unde se află proprietatea?</h2>

                            <div className="h-80 w-full border-2 border-gray-100 rounded-xl overflow-hidden shadow-inner">
                                <LocationPicker
                                    lat={formData.latitude}
                                    lng={formData.longitude}
                                    onLocationSelect={(lat, lng) => {
                                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className={errors.neighborhood ? "text-red-500" : ""}>Cartier *</Label>
                                    <Input
                                        placeholder="Ex: Copou"
                                        value={formData.neighborhood}
                                        onChange={(e) => handleChange('neighborhood', e.target.value)}
                                        className={errors.neighborhood ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <ErrorMsg field="neighborhood" />
                                </div>
                                <div>
                                    <Label>Adresa Exactă (Opțional)</Label>
                                    <Input
                                        placeholder="Strada..."
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DETALII */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-gray-800">Detalii despre proprietate</h2>

                            <div>
                                <Label className={errors.title ? "text-red-500" : ""}>Titlu Anunț *</Label>
                                <Input
                                    placeholder="Ex: Apartament 2 camere vedere parc"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    className={errors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
                                />
                                <ErrorMsg field="title" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className={errors.price_eur ? "text-red-500" : ""}>Preț (€) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={formData.price_eur}
                                        onChange={(e) => handleChange('price_eur', e.target.value)}
                                        className={errors.price_eur ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <ErrorMsg field="price_eur" />
                                </div>
                                <div>
                                    <Label>Tip Tranzacție</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={formData.transaction_type}
                                        onChange={(e) => handleChange('transaction_type', e.target.value)}
                                    >
                                        <option value="SALE">Vânzare</option>
                                        <option value="RENT">Închiriere</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className={errors.sqm ? "text-red-500" : ""}>Suprafața (mp) *</Label>
                                    <Input
                                        type="number"
                                        value={formData.sqm}
                                        onChange={(e) => handleChange('sqm', e.target.value)}
                                        className={errors.sqm ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <ErrorMsg field="sqm" />
                                </div>
                                <div>
                                    <Label className={errors.rooms ? "text-red-500" : ""}>Nr. Camere *</Label>
                                    <Input
                                        type="number"
                                        value={formData.rooms}
                                        onChange={(e) => handleChange('rooms', e.target.value)}
                                        className={errors.rooms ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <ErrorMsg field="rooms" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className={errors.floor ? "text-red-500" : ""}>Etaj *</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ex: 1"
                                        value={formData.floor}
                                        onChange={(e) => handleChange('floor', e.target.value)}
                                        className={errors.floor ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <ErrorMsg field="floor" />
                                </div>
                                <div>
                                    <Label>An Construcție</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ex: 1990"
                                        value={formData.year_built}
                                        onChange={(e) => handleChange('year_built', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Descriere completă</Label>
                                <Textarea
                                    className="h-32"
                                    placeholder="Descrie avantajele proprietății..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* FOTO */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-gray-800">Galerie Foto</h2>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-all cursor-pointer group ${errors.images ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-blue-400'}`}
                            >
                                <div className="bg-blue-50 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className={`h-6 w-6 ${errors.images ? 'text-red-500' : 'text-blue-600'}`} />
                                </div>
                                <p className={`font-medium ${errors.images ? 'text-red-600' : 'text-gray-700'}`}>
                                    {errors.images ? 'Este obligatoriu să adaugi o poză!' : 'Click pentru a adăuga poze'}
                                </p>
                                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                            </div>

                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                                    {previewUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={handleBack} disabled={step === 1 || submitting} className="w-32">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Înapoi
                    </Button>

                    {step < 3 ? (
                        <Button onClick={handleNext} className="w-32 bg-blue-600 hover:bg-blue-700">
                            Înainte <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={submitting} className="w-48 bg-green-600 hover:bg-green-700 font-bold text-white shadow-lg shadow-green-900/10">
                            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se publică...</> : "Publică Anunț"}
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}