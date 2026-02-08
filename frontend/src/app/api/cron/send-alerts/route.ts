import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import NewListingsEmail from '../../../../../emails/NewListingsEmail';


// Initializam Supabase ADMIN (poate vedea tot)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    // 1. Securitate: Verificam parola secreta (CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log("Pornire job alerte...");

        // 2. Luam toate cautarile active
        const { data: searches, error } = await supabaseAdmin
            .from('saved_searches')
            .select('*, profiles:user_id(full_name)')
            .eq('notify_email', true);

        if (error) throw error;
        if (!searches || searches.length === 0) return NextResponse.json({ message: "Nicio alerta activa." });

        // 3. Configuram Gmail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        let emailsSent = 0;

        // 4. Iteram prin fiecare cautare
        for (const search of searches) {
            
            // A. Luam adresa de email REALA din sistemul de Auth (cea mai sigura metoda)
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(search.user_id);
            
            if (userError || !userData.user || !userData.user.email) {
                console.log(`❌ Nu am gasit email pentru userul ${search.user_id}`);
                continue;
            }
            const userEmail = userData.user.email;
            const userName = search.profiles?.full_name || "Utilizator";

            // B. Cautam anunturi NOI (create in ultimele 24h sau de la ultima rulare)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 30); 

            let query = supabaseAdmin
                .from('listings')
                .select('*')
                .gt('created_at', yesterday.toISOString()); // Doar cele noi

            // C. Aplicam filtrele salvate de user
            const filters = search.filters;
            if (filters.min_price) query = query.gte('price_eur', filters.min_price);
            if (filters.max_price) query = query.lte('price_eur', filters.max_price);
            if (filters.rooms && filters.rooms !== 'all') query = query.gte('rooms', filters.rooms);
            if (filters.neighborhood) query = query.ilike('neighborhood', `%${filters.neighborhood}%`);
            
            // Executam cautarea
            const { data: newMatches } = await query;

            // D. Trimitem Email daca am gasit ceva
            if (newMatches && newMatches.length > 0) {
                console.log(`📧 Trimitem email catre ${userEmail} cu ${newMatches.length} anunturi.`);
                
                const emailHtml = await render(NewListingsEmail({
                    userName: userName,
                    searchName: search.name,
                    listings: newMatches
                }));

                await transporter.sendMail({
                    from: `"Nidus Homes" <${process.env.GMAIL_USER}>`,
                    to: userEmail,
                    subject: `🔔 ${newMatches.length} Anunțuri noi: ${search.name}`,
                    html: emailHtml,
                });

                emailsSent++;
            }
        }

        return NextResponse.json({ success: true, emails_sent: emailsSent });

    } catch (error: any) {
        console.error("Eroare CRON:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}