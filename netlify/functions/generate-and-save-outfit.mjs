import { Client } from '@gradio/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const { personImageUrl, clothingImageUrl, itemIds } = await req.json();

    // 1. Try-On-KI aufrufen
    const personBlob = await (await fetch(personImageUrl)).blob();
    const clothingBlob = await (await fetch(clothingImageUrl)).blob();

    const client = await Client.connect("yisol/IDM-VTON");
    const result = await client.predict("/tryon", {
      dict: { background: personBlob, layers: [], composite: null },
      garm_img: clothingBlob,
      garment_des: "clothing item",
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 30,
      seed: 42
    });

    const tempImageUrl = result.data[0]?.url || result.data[0];

    // 2. Ergebnisbild herunterladen und dauerhaft bei uns speichern
    const resultBlob = await (await fetch(tempImageUrl)).blob();
    const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());
    const fileName = `${Date.now()}-outfit.png`;

    const { error: uploadError } = await supabase.storage
      .from('outfit-results')
      .upload(fileName, resultBuffer, { contentType: 'image/png' });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('outfit-results')
      .getPublicUrl(fileName);

    // 3. In der Datenbank speichern
    const { data: outfitData, error: dbError } = await supabase
      .from('outfits')
      .insert([{ item_ids: itemIds, result_image_url: publicUrlData.publicUrl }])
      .select();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, outfit: outfitData[0] }), {
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