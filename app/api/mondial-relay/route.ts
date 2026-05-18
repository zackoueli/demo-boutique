import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const MR_ENSEIGNE = process.env.MONDIAL_RELAY_ENSEIGNE!;
const MR_CLE = process.env.MONDIAL_RELAY_CLE!;

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex").toUpperCase();
}

async function geocode(address: string, cp: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, ${cp} ${city}, France`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "User-Agent": "histoire-eternelle-l-atelier.fr" },
    });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cp = searchParams.get("cp");
  const pays = searchParams.get("pays") ?? "FR";

  if (!cp) return NextResponse.json({ error: "Code postal requis" }, { status: 400 });

  try {
    const security = md5(`${MR_ENSEIGNE}${pays}${cp}${MR_CLE}`);

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <WSI2_RecherchePointRelais xmlns="http://www.mondialrelay.fr/webservice/">
      <Enseigne>${MR_ENSEIGNE}</Enseigne>
      <Pays>${pays}</Pays>
      <CP>${cp}</CP>
      <Nombre>7</Nombre>
      <Security>${security}</Security>
    </WSI2_RecherchePointRelais>
  </soap:Body>
</soap:Envelope>`;

    const res = await fetch("https://api.mondialrelay.com/Web_Services.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://www.mondialrelay.fr/webservice/WSI2_RecherchePointRelais",
      },
      body: soapBody,
    });

    const xml = await res.text();
    const points = parseRelayPoints(xml);

    // Géocodage en parallèle
    const geocoded = await Promise.all(
      points.map(async (p) => {
        const coords = await geocode(p.address, p.postalCode, p.city);
        return { ...p, ...coords };
      })
    );

    return NextResponse.json({ points: geocoded });
  } catch (err) {
    console.error("[mondial-relay]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function parseRelayPoints(xml: string) {
  const points = [];
  const regex = /<PR\d+>([\s\S]*?)<\/PR\d+>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>(.*?)</${tag}>`).exec(block);
      return m ? m[1].trim() : "";
    };

    const id = get("Num");
    const name = get("LgAdr1") || get("LgAdr2");
    const address = get("LgAdr3") || get("LgAdr4");
    const cp = get("CP");
    const ville = get("Ville");

    if (id && name) {
      points.push({ id, name, address, city: ville, postalCode: cp });
    }
  }

  return points;
}
