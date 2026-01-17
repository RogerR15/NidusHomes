'use client';
import { Search, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterBarProps {
    filters: {
        searchTerm: string;
        minPrice: string;
        maxPrice: string;
        minSqm: string;
        maxSqm: string;
    };
    setFilters: (filters: any) => void;
}

export default function FilterBar({ filters, setFilters }: FilterBarProps) {
    // State pentru a deschide/închide dropdown-urile (opțional, pentru MVP le ținem inline sau simple)
    // Pentru început, vom face input-uri stilizate care arată ca butoanele Zillow

    const handleInputChange = (field: string, value: string) => {
        setFilters((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-4">

            {/* 1. SEARCH BAR (Stânga - Ca pe Zillow) */}
            <div className="flex-1 min-w-50 relative">
                <input
                    type="text"
                    placeholder="Caută adresă, cartier..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={filters.searchTerm}
                    onChange={(e) => handleInputChange('searchTerm', e.target.value)}
                />
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>

            {/* 2. FILTRE (Dreapta) */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">

                {/* Filtru PREȚ */}
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden group focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <div className="px-3 py-2 bg-white border-r border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Preț (€)
                    </div>
                    <input
                        type="number"
                        placeholder="Min"
                        className="w-20 px-2 py-2 text-sm bg-transparent focus:outline-none text-center"
                        value={filters.minPrice}
                        onChange={(e) => handleInputChange('minPrice', e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        className="w-20 px-2 py-2 text-sm bg-transparent focus:outline-none text-center"
                        value={filters.maxPrice}
                        onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                    />
                </div>

                {/* Filtru SUPRAFAȚĂ */}
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden group focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <div className="px-3 py-2 bg-white border-r border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Mp
                    </div>
                    <input
                        type="number"
                        placeholder="Min"
                        className="w-16 px-2 py-2 text-sm bg-transparent focus:outline-none text-center"
                        value={filters.minSqm}
                        onChange={(e) => handleInputChange('minSqm', e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        className="w-16 px-2 py-2 text-sm bg-transparent focus:outline-none text-center"
                        value={filters.maxSqm}
                        onChange={(e) => handleInputChange('maxSqm', e.target.value)}
                    />
                </div>

                {/* Buton Reset (apare doar dacă sunt filtre active) */}
                {(filters.minPrice || filters.maxPrice || filters.searchTerm || filters.minSqm) && (
                    <button
                        onClick={() => setFilters({ searchTerm: '', minPrice: '', maxPrice: '', minSqm: '', maxSqm: '' })}
                        className="text-blue-600 text-sm font-bold hover:underline px-2"
                    >
                        Resetează
                    </button>
                )}
            </div>
        </div>
    );
}