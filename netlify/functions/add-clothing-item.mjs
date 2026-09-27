import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const { category, image_url, tags, userId } = await req.json();
    if (!userId) throw new Error('userId erforderlich');

    const { data, error } = await supabase
      .from('clothing_items')
      .insert([{ category, image_url, tags, user_id: userId }])
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, item: data[0] }), {
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