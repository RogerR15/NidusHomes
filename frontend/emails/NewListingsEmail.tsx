import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Row,
  Column,
} from "@react-email/components";

interface Listing {
  id: number;
  title: string;
  price_eur: number;
  image_url: string;
  address: string;
  rooms: number;
}

interface EmailProps {
  userName: string;
  searchName: string;
  listings: Listing[];
}

export const NewListingsEmail = ({
  userName,
  searchName,
  listings,
}: EmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{`🏠 Au apărut ${listings.length} anunțuri noi pentru tine!`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* HEADER */}
          <Section style={header}>
            <Heading style={h1}>Salut, {userName || "Exploratorule"}!</Heading>
            <Text style={text}>
              Avem vești bune. Am găsit <strong>{listings.length} proprietăți noi</strong> care se potrivesc cu alerta ta salvată: <span style={badge}>{searchName}</span>.
            </Text>
          </Section>

          {/* LISTA ANUNTURI */}
          <Section style={listingsContainer}>
            {listings.map((item) => (
              <Row key={item.id} style={listingRow}>
                <Column style={{ width: "160px" }}>
                  <Img
                    src={item.image_url || "https://via.placeholder.com/150"}
                    width="150"
                    height="100"
                    style={listingImage}
                    alt={item.title}
                  />
                </Column>
                <Column style={{ paddingLeft: "15px" }}>
                  <Text style={listingTitle}>{item.title}</Text>
                  <Text style={listingMeta}>
                    📍 {item.address} • 🛏️ {item.rooms} Camere
                  </Text>
                  <Text style={listingPrice}>
                    {item.price_eur.toLocaleString()} €
                  </Text>
                  <Button
                    style={button}
                    href={`http://localhost:3000/listing/${item.id}`} // Schimba cu domeniul tau cand faci deploy
                  >
                    Vezi Detalii
                  </Button>
                </Column>
              </Row>
            ))}
          </Section>

          {/* FOOTER */}
          <Section style={footer}>
            <Text style={footerText}>
              Ai primit acest email de la Nidus Homes.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// --- STILURI CSS (Inline) ---
const main = { backgroundColor: "#f6f9fc", fontFamily: 'sans-serif' };
const container = { backgroundColor: "#ffffff", margin: "0 auto", padding: "20px 0 48px", borderRadius: "8px" };
const header = { padding: "40px 40px 20px" };
const h1 = { color: "#333", fontSize: "24px", fontWeight: "bold", margin: "0 0 10px" };
const text = { color: "#525f7f", fontSize: "16px", lineHeight: "24px" };
const badge = { backgroundColor: "#e6f1ff", color: "#0066cc", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" };
const listingsContainer = { padding: "0 40px" };
const listingRow = { borderBottom: "1px solid #f0f0f0", paddingBottom: "20px", marginBottom: "20px" };
const listingImage = { borderRadius: "8px", objectFit: "cover" as const };
const listingTitle = { fontSize: "16px", fontWeight: "bold", color: "#333", margin: "0 0 5px" };
const listingMeta = { fontSize: "14px", color: "#8898aa", margin: "0 0 5px" };
const listingPrice = { fontSize: "18px", fontWeight: "bold", color: "#2563eb", margin: "0 0 10px" };
const button = { backgroundColor: "#2563eb", borderRadius: "6px", color: "#fff", fontSize: "12px", fontWeight: "bold", textDecoration: "none", padding: "8px 16px", display: "inline-block" };
const footer = { padding: "0 40px", textAlign: "center" as const };
const footerText = { fontSize: "12px", color: "#8898aa" };

export default NewListingsEmail;