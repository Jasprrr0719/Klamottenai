import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const { front_photo_url, back_photo_url, height_cm, weight_kg, userId } = await req.json();
    if (!userId) throw new Error('userId erforderlich');

    const { data: existing } = await supabase.from('profile').select('id').eq('user_id', userId).limit(1);

    let result;
    if (existing && existing.length > 0) {
      result = await supabase
        .from('profile')
        .update({ front_photo_url, back_photo_url, height_cm, weight_kg })
        .eq('id', existing[0].id)
        .select();
    } else {
      result = await supabase
        .from('profile')
        .insert([{ front_photo_url, back_photo_url, height_cm, weight_kg, user_id: userId }])
        .select();
    }

    if (result.error) throw result.error;

    return new Response(JSON.stringify({ success: true, profile: result.data[0] }), {
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