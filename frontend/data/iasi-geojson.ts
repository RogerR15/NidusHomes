// frontend/data/iasi-geojson.ts

export const iasiGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Municipiul Iași (Administrativ)" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            // --- NORD (Granița cu Breazu / Aroneanu) ---
            [27.5385, 47.2280], // Zona Agronomie / Breazu (Intrare)
            [27.5600, 47.2350], // Sorogari (Vârf Nord)
            [27.5850, 47.2200], // Lacul Aroneanu (Sudul lacului)
            
            // --- NORD-EST (Aeroport / Ciric) ---
            [27.6150, 47.2150], // Pădurea Ciric
            [27.6380, 47.1980], // Pista Aeroport (Capăt Nord)
            [27.6450, 47.1850], // Aeroport (Capăt Sud)

            // --- EST (Granița cu Holboca / Dancu) ---
            // Dancu este EXTERIOR, linia trece pe la Doi Băieți / Phoenix
            [27.6400, 47.1650], // Zona Aurel Vlaicu (limita cu Dancu)
            [27.6650, 47.1580], // Podul Sf. Ioan

            // --- SUD-EST (Zona Industrială / Tomești) ---
            // Tomești este EXTERIOR
            [27.7000, 47.1450], // Chimplex / Calea Chișinăului
            [27.7250, 47.1350], // Limita extremă estică (spre Tomești)
            [27.7050, 47.1250], // Întoarcere spre Bucium

            // --- SUD (Bucium / Păun) ---
            [27.6950, 47.1050], // Plopii fără Soț
            [27.6850, 47.0850], // Vârf Sud Bucium (spre releu)
            [27.6650, 47.0950], // Bucium (Zona vile)

            // --- SUD-VEST (Granița cu Ciurea / Vișan) ---
            // Vișan este EXTERIOR
            [27.6450, 47.1150], // Limita cu Vișan
            [27.6150, 47.1050], // Hlincea (Mănăstirea este la limită)
            [27.5950, 47.1100], // Dedeman / CUG

            // --- SUD-VEST (Granița cu Lunca Cetățuii / Miroslava) ---
            [27.5750, 47.1080], // Capăt CUG (Nicolina)
            [27.5550, 47.1250], // Galata (Platou)
            [27.5450, 47.1350], // Belvedere / Miroslava (Limită)

            // --- VEST (Valea Lupului / Păcurari) ---
            // Valea Lupului este EXTERIOR
            [27.5250, 47.1550], // Antibiotice (Limită)
            [27.4950, 47.1650], // Carrefour Era (Limită)
            [27.4850, 47.1750], // Capăt Păcurari (Alpha Bank)

            // --- NORD-VEST (Rediu) ---
            [27.4950, 47.1900], // Zona Rediu (Limită)
            [27.5150, 47.2050], // Grădina Botanică (Spate)
            
            // --- ÎNCHIDERE BUCLĂ ---
            [27.5385, 47.2280]
          ]
        ]
      }
    }
  ]
};