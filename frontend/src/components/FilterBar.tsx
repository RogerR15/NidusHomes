'use client';
import { useState, useRef, useEffect } from 'react';

interface FilterBarProps {
    onFilter: (filters: any) => void;
}

export default function FilterBar({ onFilter }: FilterBarProps) {
    // Starea filtrelor
    const [filters, setFilters] = useState({
        neighborhood: '',
        transaction_type: 'SALE',
        min_price: '',
        max_price: '',
        rooms_min: '',
    });

    // Gestionăm care meniu este deschis ('type', 'price', 'beds', null)
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // Referință pentru a detecta click-ul în afara meniului
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Aplicare automată când se schimbă o valoare (opțional, sau la butonul "Apply")
    const applyFilters = (newFilters: any) => {
        setFilters(newFilters);
        // Trimitem doar valorile care nu sunt goale
        const clean: any = {};
        if (newFilters.neighborhood) clean.neighborhood = newFilters.neighborhood;
        if (newFilters.transaction_type) clean.transaction_type = newFilters.transaction_type;
        if (newFilters.min_price) clean.min_price = newFilters.min_price;
        if (newFilters.max_price) clean.max_price = newFilters.max_price;
        if (newFilters.rooms_min) clean.rooms_min = newFilters.rooms_min;

        onFilter(clean);
    };

    const handleChange = (field: string, value: string) => {
        const updated = { ...filters, [field]: value };
        applyFilters(updated);
    };

    // Formatare etichete butoane (ca să arate ca pe Zillow)
    const getPriceLabel = () => {
        if (filters.min_price && filters.max_price) return `${filters.min_price} € - ${filters.max_price} €`;
        if (filters.max_price) return `Până la ${filters.max_price} €`;
        if (filters.min_price) return `Peste ${filters.min_price} €`;
        return "Preț";
    };

    const getBedsLabel = () => {
        if (filters.rooms_min) return `${filters.rooms_min}+ Camere`;
        return "Camere";
    };

    return (
        <div className="bg-white border-b border-gray-200 p-3 flex flex-col md:flex-row gap-3 items-center shadow-sm relative z-1001" ref={menuRef}>

            {/* 1. INPUT CĂUTARE (Stânga) */}
            <div className="relative w-full md:w-80 shrink-0">
                <input
                    type="text"
                    placeholder="Caută adresă, cartier..."
                    className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-10 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={filters.neighborhood}
                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* 2. BUTOANE FILTRE (Mijloc) */}
            <div className="flex flex-wrap gap-2 w-full items-center">

                {/* -- Tip Tranzacție -- */}
                <div className="relative">
                    <button
                        onClick={() => setOpenMenu(openMenu === 'type' ? null : 'type')}
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-1
              ${openMenu === 'type' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}
            `}
                    >
                        {filters.transaction_type === 'SALE' ? 'De Vânzare' : 'De Închiriat'}
                        <ChevronDown />
                    </button>

                    {openMenu === 'type' && (
                        <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-gray-200 shadow-xl rounded-lg p-2 flex flex-col gap-1">
                            <button onClick={() => { handleChange('transaction_type', 'SALE'); setOpenMenu(null); }} className={`text-left px-4 py-2 rounded text-sm ${filters.transaction_type === 'SALE' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50'}`}>
                                De Vânzare
                            </button>
                            <button onClick={() => { handleChange('transaction_type', 'RENT'); setOpenMenu(null); }} className={`text-left px-4 py-2 rounded text-sm ${filters.transaction_type === 'RENT' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-50'}`}>
                                De Închiriat
                            </button>
                        </div>
                    )}
                </div>

                {/* -- Preț -- */}
                <div className="relative">
                    <button
                        onClick={() => setOpenMenu(openMenu === 'price' ? null : 'price')}
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-1
              ${openMenu === 'price' || filters.min_price || filters.max_price ? 'border-blue-500 text-blue-700 bg-blue-50' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}
            `}
                    >
                        {getPriceLabel()}
                        <ChevronDown />
                    </button>

                    {openMenu === 'price' && (
                        <div className="absolute top-full mt-2 left-0 w-72 bg-white border border-gray-200 shadow-xl rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 mb-3">Interval Preț (€)</h3>
                            <div className="flex gap-2 items-center mb-4">
                                <input
                                    type="number" placeholder="Min"
                                    value={filters.min_price}
                                    onChange={(e) => handleChange('min_price', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="number" placeholder="Max"
                                    value={filters.max_price}
                                    onChange={(e) => handleChange('max_price', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>
                            <button onClick={() => setOpenMenu(null)} className="w-full bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700">
                                Aplică
                            </button>
                        </div>
                    )}
                </div>

                {/* -- Camere -- */}
                <div className="relative">
                    <button
                        onClick={() => setOpenMenu(openMenu === 'beds' ? null : 'beds')}
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-1
              ${openMenu === 'beds' || filters.rooms_min ? 'border-blue-500 text-blue-700 bg-blue-50' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}
            `}
                    >
                        {getBedsLabel()}
                        <ChevronDown />
                    </button>

                    {openMenu === 'beds' && (
                        <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-4">
                            <h3 className="font-bold text-gray-700 mb-3">Număr Camere</h3>
                            <div className="flex flex-col gap-1">
                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="rooms" checked={filters.rooms_min === ''} onChange={() => handleChange('rooms_min', '')} />
                                    <span className="text-sm">Oricâte</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="rooms" checked={filters.rooms_min === '1'} onChange={() => handleChange('rooms_min', '1')} />
                                    <span className="text-sm">1+ Camere</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="rooms" checked={filters.rooms_min === '2'} onChange={() => handleChange('rooms_min', '2')} />
                                    <span className="text-sm">2+ Camere</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="rooms" checked={filters.rooms_min === '3'} onChange={() => handleChange('rooms_min', '3')} />
                                    <span className="text-sm">3+ Camere</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                    <input type="radio" name="rooms" checked={filters.rooms_min === '4'} onChange={() => handleChange('rooms_min', '4')} />
                                    <span className="text-sm">4+ Camere</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* 3. SAVE SEARCH (Dreapta) */}
            <div className="ml-auto flex items-center gap-3">
                <button className="text-blue-600 font-bold text-sm hover:underline hidden md:block">
                    Salvează Căutarea
                </button>
                {/* <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold text-sm shadow-sm transition-transform active:scale-95">
                    Reset View
                </button> */}
            </div>

        </div>
    );
}

// Iconita Chevron simpla
function ChevronDown() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}