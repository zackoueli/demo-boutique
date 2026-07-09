import { NextRequest, NextResponse } from "next/server";

const MR_LOGIN = process.env.MONDIAL_RELAY_API2_LOGIN ?? "";
const MR_PASSWORD = process.env.MONDIAL_RELAY_API2_PASSWORD ?? "";
const MR_CUSTOMER_ID = process.env.MONDIAL_RELAY_API2_CUSTOMER_ID ?? "";

const SENDER_NAME = process.env.SHOP_SENDER_NAME ?? "";
const SENDER_ADDRESS = process.env.SHOP_SENDER_ADDRESS ?? "";
const SENDER_CITY = process.env.SHOP_SENDER_CITY ?? "";
const SENDER_POSTAL = process.env.SHOP_SENDER_POSTAL ?? "";
const SENDER_COUNTRY = process.env.SHOP_SENDER_COUNTRY ?? "FR";
const SENDER_PHONE = process.env.SHOP_SENDER_PHONE ?? "";

const MR_API_URL = process.env.MONDIAL_RELAY_API2_URL ?? "https://connect-api.mondialrelay.com/api/Shipment";

interface CreateShipmentPayload {
  orderId: string;
  weightGrams: number;
  recipient: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  relayPointId: string;
  relayCountry?: string;
}

interface ShipmentResult {
  expeditionNumber: string;
  labelUrl: string;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTag(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?\\s${attr}="([^"]*)"[^>]*>`).exec(xml);
  return m ? m[1] : "";
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function createShipmentAtMondialRelay(payload: CreateShipmentPayload): Promise<ShipmentResult> {
  if (!MR_LOGIN || !MR_PASSWORD || !MR_CUSTOMER_ID) {
    throw new Error(
      "Identifiants API2 Mondial Relay non configurés (MONDIAL_RELAY_API2_LOGIN / MONDIAL_RELAY_API2_PASSWORD / MONDIAL_RELAY_API2_CUSTOMER_ID)"
    );
  }
  if (!SENDER_NAME || !SENDER_ADDRESS || !SENDER_CITY || !SENDER_POSTAL) {
    throw new Error(
      "Adresse expéditeur Mondial Relay non configurée (SHOP_SENDER_NAME / SHOP_SENDER_ADDRESS / SHOP_SENDER_CITY / SHOP_SENDER_POSTAL)"
    );
  }

  const { orderId, weightGrams, recipient, relayPointId, relayCountry } = payload;
  const country = recipient.country ?? "FR";
  const relayLocation = `${relayCountry ?? country}-${relayPointId}`;

  const requestXml = `<?xml version="1.0" encoding="utf-8"?>
<ShipmentCreationRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.example.org/Request">
  <Context>
    <Login>${xmlEscape(MR_LOGIN)}</Login>
    <Password>${xmlEscape(MR_PASSWORD)}</Password>
    <CustomerId>${xmlEscape(MR_CUSTOMER_ID)}</CustomerId>
    <Culture>fr-FR</Culture>
    <VersionAPI>1.0</VersionAPI>
  </Context>
  <OutputOptions>
    <OutputFormat>A4</OutputFormat>
    <OutputType>PdfUrl</OutputType>
  </OutputOptions>
  <ShipmentsList>
    <Shipment>
      <OrderNo>${xmlEscape(orderId.slice(0, 15))}</OrderNo>
      <ParcelCount>1</ParcelCount>
      <DeliveryMode Mode="24R" Location="${xmlEscape(relayLocation)}" />
      <CollectionMode Mode="CCC" Location="" />
      <Parcels>
        <Parcel>
          <Weight Value="${weightGrams}" Unit="gr" />
        </Parcel>
      </Parcels>
      <Sender>
        <Address>
          <Streetname>${xmlEscape(SENDER_ADDRESS)}</Streetname>
          <CountryCode>${xmlEscape(SENDER_COUNTRY)}</CountryCode>
          <PostCode>${xmlEscape(SENDER_POSTAL)}</PostCode>
          <City>${xmlEscape(SENDER_CITY)}</City>
          <AddressAdd1>${xmlEscape(SENDER_NAME)}</AddressAdd1>
          <PhoneNo>${xmlEscape(SENDER_PHONE)}</PhoneNo>
        </Address>
      </Sender>
      <Recipient>
        <Address>
          <Streetname>${xmlEscape(recipient.address)}</Streetname>
          <CountryCode>${xmlEscape(country)}</CountryCode>
          <PostCode>${xmlEscape(recipient.postalCode)}</PostCode>
          <City>${xmlEscape(recipient.city)}</City>
          <AddressAdd1>${xmlEscape(recipient.fullName)}</AddressAdd1>
          <PhoneNo>${xmlEscape(recipient.phone ?? "")}</PhoneNo>
          <Email>${xmlEscape(recipient.email ?? "")}</Email>
        </Address>
      </Recipient>
    </Shipment>
  </ShipmentsList>
</ShipmentCreationRequest>`;

  const res = await fetch(MR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "Accept": "application/xml",
    },
    body: requestXml,
  });

  const xml = await res.text();

  const statusCode = extractAttr(xml, "Status", "Code");
  const statusMessage = extractAttr(xml, "Status", "Message");
  if (statusCode && statusCode !== "0") {
    throw new Error(`Mondial Relay a refusé la création (code ${statusCode}): ${xmlUnescape(statusMessage) || "raison inconnue"}`);
  }

  const expeditionNumber = extractAttr(xml, "Shipment", "ShipmentNumber");
  const labelUrl = xmlUnescape(extractTag(xml, "Output"));

  if (!expeditionNumber) {
    throw new Error(`Réponse Mondial Relay invalide : numéro d'expédition manquant. Réponse brute : ${xml.slice(0, 500)}`);
  }

  return { expeditionNumber, labelUrl };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateShipmentPayload;

    if (!body.orderId || !body.relayPointId || !body.recipient || !body.weightGrams) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const result = await createShipmentAtMondialRelay(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[mondial-relay/create-shipment]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
