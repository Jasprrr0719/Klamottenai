import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) throw new Error('userId erforderlich');

    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, profile: data[0] || null }), {
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