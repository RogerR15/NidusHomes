
import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/client";

export async function GET(request: Request) {
  // Extragem codul de autorizare din URL
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Daca exista parametrul 'next', il folosim pentru redirect, altfel mergem acasa
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // Schimbam codul pentru o sesiune valida
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Daca totul e ok, redirectionam userul in aplicatie
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Daca ceva nu a mers, il trimitem inapoi la login cu o eroare
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}