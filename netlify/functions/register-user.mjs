import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async (req) => {
  try {
    const { username, password } = await req.json();
    if (!username || !password) throw new Error('Benutzername und Passwort erforderlich');

    const { data: existing } = await supabase.from('users').select('id').eq('username', username);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'Benutzername bereits vergeben' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const password_hash = hashPassword(password);
    const { data, error } = await supabase.from('users').insert([{ username, password_hash }]).select();
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, userId: data[0].id, username: data[0].username }), {
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