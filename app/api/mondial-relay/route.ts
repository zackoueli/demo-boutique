import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const MR_ENSEIGNE = process.env.MONDIAL_RELAY_ENSEIGNE!;
const MR_CLE = process.env.MONDIAL_RELAY_CLE!;

function md5(str: string): string {
  return createHash("md5").update(str).digest("hex").toUpperCase();
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
    console.log("[mondial-relay] response:", xml.slice(0, 1000));

    const points = parseRelayPoints(xml);
    return NextResponse.json({ points, debug: xml.slice(0, 2000) });
  } catch (err) {
    console.error("[mondial-relay]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function parseRelayPoints(xml: string) {
  const points = [];
  const regex = /<PointRelais_Details>([\s\S]*?)<\/PointRelais_Details>/g;
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
    const dist = get("Dist");

    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const horaires: string[] = [];
    days.forEach((day) => {
      const h = get(`Horaires_${day}`);
      if (h && h !== "0000-0000") {
        const parts = h.split("-");
        if (parts.length === 2) {
          const fmt = (s: string) => `${s.slice(0, 2)}h${s.slice(2) !== "00" ? s.slice(2) : ""}`;
          horaires.push(`${day.slice(0, 3)} ${fmt(parts[0])}–${fmt(parts[1])}`);
        }
      }
    });

    if (id && name) {
      points.push({
        id,
        name,
        address,
        city: ville,
        postalCode: cp,
        distance: dist ? `${(parseInt(dist) / 1000).toFixed(1)} km` : undefined,
        hours: horaires.slice(0, 3).join(", ") || undefined,
      });
    }
  }

  return points;
}
