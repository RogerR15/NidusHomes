'use client';

export default function DescriptionViewer({ text }: { text: string }) {
    if (!text) return null;

    // Spargem textul in linii
    const lines = text.split('\n').filter(line => line.trim() !== '');


    const isHeader = (line: string) => {
        const clean = line.trim();
        // E titlu daca e scurt (sub 40 caractere) SI (se termina cu ':' SAU e scris cu CAPS LOCK)
        return clean.length < 40 && (clean.endsWith(':') || clean === clean.toUpperCase() && clean.length > 4);
    };

    // Functie pentru a detecta liste
    const isListItem = (line: string) => {
        const clean = line.trim();
        return clean.startsWith('-') || clean.startsWith('•') || clean.startsWith('*') || clean.startsWith('>');
    };

    return (
        <div className="space-y-4 text-stone-700 leading-relaxed font-light">
            {lines.map((line, index) => {
                const cleanLine = line.trim();

                // Titlu de sectiune
                if (isHeader(cleanLine)) {
                    return (
                        <h3 key={index} className="text-lg font-bold text-slate-900 mt-6 mb-2 border-b border-gray-100 pb-1 inline-block">
                            {cleanLine.replace(':', '')}
                        </h3>
                    );
                }

                // Element de lista
                if (isListItem(cleanLine)) {
                    return (
                        <div key={index} className="flex items-start gap-2 ml-2">
                            <span className="text-blue-500 mt-1.5 text-[10px]">●</span>
                            <span className="text-slate-600">{cleanLine.replace(/^[-•*>]\s*/, '')}</span>
                        </div>
                    );
                }

                // Paragraf normal 
                return (
                    <p key={index} className="mb-2">
                        {cleanLine}
                    </p>
                );
            })}
        </div>
    );
}