import { Client } from '@gradio/client';

export default async (req) => {
  try {
    const { personImageUrl, clothingImageUrl } = await req.json();

    // Bilder als Blobs laden (der Hugging-Face-Space braucht Dateien, keine URLs)
    const personBlob = await (await fetch(personImageUrl)).blob();
    const clothingBlob = await (await fetch(clothingImageUrl)).blob();

    // Verbindung zum Hugging-Face-Space aufbauen (mit Token für höheres Kontingent)
    const client = await Client.connect("yisol/IDM-VTON", { hf_token: process.env.HF_TOKEN });

    const result = await client.predict("/tryon", {
      dict: { background: personBlob, layers: [], composite: null },
      garm_img: clothingBlob,
      garment_des: "clothing item",
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 40,
      seed: 42
    });

    // Ergebnis enthält eine URL zum generierten Bild
    const resultImageUrl = result.data[0]?.url || result.data[0];

    return new Response(JSON.stringify({ success: true, resultImageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("FEHLER:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};