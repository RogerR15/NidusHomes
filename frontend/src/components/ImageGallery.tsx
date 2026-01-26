'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Grid3X3 } from 'lucide-react';

interface ImageGalleryProps {
    images: string[];
}

export default function ImageGallery({ images = [] }: ImageGalleryProps) {
    const safeImages = images.length > 0 ? images : ['/placeholder-house.jpg'];
    const [isOpen, setIsOpen] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);

    //LOGICA DE NAVIGARE
    const openLightbox = (index: number) => {
        setPhotoIndex(index);
        setIsOpen(true);
        // Oprim scroll-ul paginii din spate cand deschidem galeria
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setIsOpen(false);
        // Repornim scroll-ul paginii
        document.body.style.overflow = 'unset';
    };

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPhotoIndex((prev) => (prev === 0 ? safeImages.length - 1 : prev - 1));
    }, [safeImages.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPhotoIndex((prev) => (prev === safeImages.length - 1 ? 0 : prev + 1));
    }, [safeImages.length]);

    // KEYBOARD SUPPORT 
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handlePrev, handleNext]);

    return (
        <>
            {/* GRID-UL DIN PAGINA */}
            <div className="relative w-full h-75 md:h-100 lg:h-125 rounded-xl overflow-hidden shadow-sm group border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-2 h-full">
                    {/* Main Photo */}
                    <div
                        className="col-span-2 row-span-2 relative cursor-pointer overflow-hidden"
                        onClick={() => openLightbox(0)}
                    >
                        <Image src={safeImages[0]} alt="Main" fill className="object-cover hover:scale-105 transition-transform duration-500" priority />
                    </div>
                    {/* Small Photos */}
                    <div className="hidden md:grid col-span-2 row-span-2 grid-cols-2 grid-rows-2 gap-2">
                        {safeImages.slice(1, 5).map((img, idx) => (
                            <div key={idx} className="relative cursor-pointer overflow-hidden" onClick={() => openLightbox(idx + 1)}>
                                <Image src={img} alt={`Gallery ${idx}`} fill className="object-cover hover:scale-105 transition-transform duration-300" />
                                {idx === 3 && safeImages.length > 5 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg hover:bg-black/60 transition-colors">+{safeImages.length - 5}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <Button variant="secondary" size="sm" className="absolute bottom-4 right-4 shadow-lg border border-gray-200 hidden md:flex gap-2 font-semibold" onClick={() => openLightbox(0)}>
                    <Grid3X3 size={16} /> Toate pozele ({safeImages.length})
                </Button>
            </div>

            {/*CUSTOM LIGHTBOX OVERLAY*/}
            {isOpen && (
                <div className="fixed inset-0 z-9999 bg-[#1a1a1a] flex flex-col animate-in fade-in duration-200">

                    {/* HEADER */}
                    <div className="flex justify-between items-center p-4 text-white z-50 bg-linear-to-b from-black/50 to-transparent">
                        <div className="font-medium tracking-wide">
                            {photoIndex + 1} / {safeImages.length}
                        </div>
                        <button
                            onClick={closeLightbox}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {/* MAIN IMAGE AREA */}
                    
                    <div className="flex-1 pb-4 relative w-full h-full overflow-hidden flex items-center justify-center">

                        {/* Imaginea - Fara limite de container */}
                        <div className="relative w-full h-full">
                            <Image
                                src={safeImages[photoIndex]}
                                alt="Fullscreen view"
                                fill
                                className="object-contain"
                                priority
                                quality={100}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        </div>

                        {/* Buton Stanga */}
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/70 hover:text-white hover:bg-black/20 rounded-full transition-all outline-none focus:bg-white/10"
                        >
                            <ChevronLeft size={56} strokeWidth={1} />
                        </button>

                        {/* Buton Dreapta */}
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/70 hover:text-white hover:bg-black/20 rounded-full transition-all outline-none focus:bg-white/10"
                        >
                            <ChevronRight size={56} strokeWidth={1} />
                        </button>

                    </div>
                </div>
            )}
        </>
    );
}