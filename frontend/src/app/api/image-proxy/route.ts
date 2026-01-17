import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Extragem URL-ul imaginii reale din parametrii cererii
    // /api/image-proxy?url=https%3A%2F%2Fireland.apollo...
    const imageUrl = request.nextUrl.searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing "url" parameter', { status: 400 });
    }

    try {
        // Serverul Next.js face cererea catre OLX
        const response = await fetch(imageUrl, {
            headers: {
                //  Pacalim OLX ca cererea vine de la ei de pe site
                'Referer': 'https://www.olx.ro/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image. Status: ${response.status}`);
        }

        // Luam datele imaginii (binare)
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        //  Returnam imaginea catre frontend cu tipul corect
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                // Optional: Cache pentru performanta
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200'
            },
        });

    } catch (error) {
        console.error('Image Proxy Error:', error);
        // Returnam o imagine placeholder in caz de eroare
        return NextResponse.redirect('https://placehold.co/600x400?text=Eroare+Imagine');
    }
}