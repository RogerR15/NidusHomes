'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import axios from 'axios';
import { Loader2, X, UploadCloud, AlertCircle } from 'lucide-react';
import { createClient } from '../../../../utils/supabase/client';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { 
    ssr: false,
    loading: () => <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg"></div> 
});

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // State pentru imagini
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_eur: '',
    sqm: '',
    rooms: '',
    floor: '',
    year_built: '',
    neighborhood: '',
    address: '', 
    transaction_type: 'SALE',
    latitude: 47.1585,
    longitude: 27.6014,
  });

  // Incarcam datele
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }

        const res = await axios.get(`http://127.0.0.1:8000/listings/${id}?increment_view=false`);
        const data = res.data;

        setFormData({
            title: data.title,
            description: data.description || '',
            price_eur: data.price_eur,
            sqm: data.sqm,
            rooms: data.rooms || '',
            floor: data.floor !== null ? data.floor : '',
            year_built: data.year_built !== null ? data.year_built : '',
            neighborhood: data.neighborhood || '',
            address: data.address || '',
            transaction_type: data.transaction_type,
            latitude: data.latitude || 47.1585,
            longitude: data.longitude || 27.6014,
        });

        if (data.images && data.images.length > 0) {
            setExistingImages(data.images);
        }

      } catch (error) {
        console.error("Eroare:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router, supabase]);

  //  Gestionare Inputuri
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Curatam eroarea cand utilizatorul scrie
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  //  Gestionare Fisiere
  const handleFileSelect = (e: any) => {
    if (e.target.files) {
        const filesArray = Array.from(e.target.files) as File[];
        setNewFiles(prev => [...prev, ...filesArray]);
        const newUrls = filesArray.map(file => URL.createObjectURL(file));
        setNewPreviews(prev => [...prev, ...newUrls]);
        
        if (errors.images) setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const removeExisting = (indexToRemove: number) => {
    setExistingImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const removeNew = (indexToRemove: number) => {
    setNewFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setNewPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Validare (CAMPURI OBLIGATORII)
  const validate = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) newErrors.title = 'Titlul este obligatoriu.';
    if (!formData.price_eur) newErrors.price_eur = 'Pretul este obligatoriu.';
    if (!formData.sqm) newErrors.sqm = 'Suprafata este obligatorie.';
    if (!formData.rooms) newErrors.rooms = 'Nr. Camere este obligatoriu.';
    if (!formData.neighborhood.trim()) newErrors.neighborhood = 'Cartierul este obligatoriu.';
    
    // Validare Etaj
    if (formData.floor === '') {
        newErrors.floor = 'Etajul este obligatoriu.';
    }
    
    // Verificam imaginile
    const totalImages = existingImages.length + newFiles.length;
    if (totalImages === 0) {
        newErrors.images = 'Anuntul trebuie sa aiba cel putin o imagine.';
        isValid = false;
    }

    if (Object.keys(newErrors).length > 0) isValid = false;

    setErrors(newErrors);
    return isValid;
  };

  // SALVARE
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!validate()) {
        alert("Te rugam sa completezi campurile obligatorii marcate cu *.");
        return;
    }

    setSaving(true);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let uploadedUrls: string[] = [];
        
        if (newFiles.length > 0) {
            const uploadPromises = newFiles.map(async (file) => {
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
                const { data, error } = await supabase.storage
                    .from('listing-images')
                    .upload(`${session?.user.id}/${fileName}`, file);
                
                if (error) throw error;
                
                const { data: publicUrlData } = supabase.storage
                    .from('listing-images')
                    .getPublicUrl(data.path);
                    
                return publicUrlData.publicUrl;
            });
            uploadedUrls = await Promise.all(uploadPromises);
        }

        const finalImagesList = [...existingImages, ...uploadedUrls];

        await axios.put(`http://127.0.0.1:8000/listings/${id}`, {
            ...formData,
            price_eur: Number(formData.price_eur),
            sqm: Number(formData.sqm),
            rooms: Number(formData.rooms),
            floor: Number(formData.floor),
            year_built: formData.year_built ? Number(formData.year_built) : null,
            latitude: Number(formData.latitude),
            longitude: Number(formData.longitude),
            images: finalImagesList 
        }, {
            headers: { Authorization: `Bearer ${session?.access_token}` }
        });

        alert("Anunt actualizat cu succes!");
        router.push('/my-listings');

    } catch (error) {
        console.error("Eroare la salvare:", error);
        alert("Eroare la salvare. Verifica consola.");
    } finally {
        setSaving(false);
    }
  };

  const ErrorMsg = ({ field }: { field: string }) => {
    return errors[field] ? (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> {errors[field]}
        </p>
    ) : null;
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center">Se încarca...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Editeaza Anuntul</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm space-y-6">
            
            {/* IMAGINI MANAGER */}
            <div className={`border rounded-xl p-4 bg-gray-50 ${errors.images ? 'border-red-400 bg-red-50' : ''}`}>
                <label className={`block text-sm font-bold mb-3 ${errors.images ? 'text-red-600' : 'text-gray-700'}`}>
                    Galerie Foto {errors.images && '* (Obligatoriu)'}
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {/* Vechi */}
                    {existingImages.map((img, idx) => (
                        <div key={`old-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-300">
                            <img src={img} className="w-full h-full object-cover" alt="Existing" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <button type="button" onClick={() => removeExisting(idx)} className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1 rounded">Existent</span>
                        </div>
                    ))}

                    {/* Noi */}
                    {newPreviews.map((preview, idx) => (
                        <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden border border-green-300">
                            <img src={preview} className="w-full h-full object-cover" alt="New Preview" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <button type="button" onClick={() => removeNew(idx)} className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <span className="absolute top-1 left-1 bg-green-600 text-white text-[10px] px-1 rounded">Nou</span>
                        </div>
                    ))}

                    {/* Upload Button */}
                    <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition aspect-square">
                        <UploadCloud className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500 font-bold">Adauga Foto</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                </div>
                <ErrorMsg field="images" />
            </div>

            {/* Inputs */}
            <div>
                <label className="block text-sm font-bold mb-2">Titlu Anunt *</label>
                <input 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange} 
                    className={`w-full border p-3 rounded-lg ${errors.title ? 'border-red-500 ring-red-500' : ''}`} 
                />
                <ErrorMsg field="title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Pret (€) *</label>
                    <input 
                        type="number" 
                        name="price_eur" 
                        value={formData.price_eur} 
                        onChange={handleChange} 
                        className={`w-full border p-3 rounded-lg ${errors.price_eur ? 'border-red-500' : ''}`} 
                    />
                    <ErrorMsg field="price_eur" />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Tip</label>
                    <select name="transaction_type" value={formData.transaction_type} onChange={handleChange} className="w-full border p-3 rounded-lg">
                        <option value="SALE">Vanzare</option>
                        <option value="RENT">Închiriere</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Suprafata (mp) *</label>
                    <input 
                        type="number" 
                        name="sqm" 
                        value={formData.sqm} 
                        onChange={handleChange} 
                        className={`w-full border p-3 rounded-lg ${errors.sqm ? 'border-red-500' : ''}`} 
                    />
                    <ErrorMsg field="sqm" />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Nr. Camere *</label>
                    <input 
                        type="number" 
                        name="rooms" 
                        value={formData.rooms} 
                        onChange={handleChange} 
                        className={`w-full border p-3 rounded-lg ${errors.rooms ? 'border-red-500' : ''}`} 
                    />
                    <ErrorMsg field="rooms" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Etaj *</label>
                    <input 
                        type="number" 
                        name="floor" 
                        value={formData.floor} 
                        onChange={handleChange} 
                        className={`w-full border p-3 rounded-lg ${errors.floor ? 'border-red-500' : ''}`} 
                        placeholder="Ex: 1" 
                    />
                    <ErrorMsg field="floor" />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">An Constructie</label>
                    <input type="number" name="year_built" value={formData.year_built} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="Ex: 1990" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold mb-2">Cartier *</label>
                    <input 
                        name="neighborhood" 
                        value={formData.neighborhood} 
                        onChange={handleChange} 
                        className={`w-full border p-3 rounded-lg ${errors.neighborhood ? 'border-red-500' : ''}`} 
                    />
                    <ErrorMsg field="neighborhood" />
                </div>
                <div>
                    <label className="block text-sm font-bold mb-2">Adresa (Optional)</label>
                    <input 
                        name="address" 
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full border p-3 rounded-lg bg-white" 
                        placeholder="Strada, Numar..."
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold mb-2">Descriere</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full border p-3 rounded-lg h-32" />
            </div>

            <div>
                <label className="block text-sm font-bold mb-2">Locatie</label>
                <div className="h-64 rounded-lg overflow-hidden border">
                    <LocationPicker 
                        lat={formData.latitude}
                        lng={formData.longitude}
                        onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))} 
                    />
                </div>
            </div>

            <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center">
                {saving ? <Loader2 className="animate-spin mr-2" /> : "Salveaza Modificarile"}
            </button>
        </form>
      </div>
    </div>
  );
}