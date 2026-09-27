import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const { tempImageUrl, itemIds, userId } = await req.json();
    if (!userId) throw new Error('userId erforderlich');

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

    const { data: outfitData, error: dbError } = await supabase
      .from('outfits')
      .insert([{ item_ids: itemIds, result_image_url: publicUrlData.publicUrl, user_id: userId }])
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