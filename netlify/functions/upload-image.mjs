import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async (req) => {
  try {
    const { fileName, fileBase64, contentType, bucket } = await req.json();

    // Base64-String in Binärdaten umwandeln
    const buffer = Buffer.from(fileBase64, 'base64');
    const uniqueName = `${Date.now()}-${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(uniqueName, buffer, { contentType });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueName);

    return new Response(JSON.stringify({ success: true, url: publicUrlData.publicUrl }), {
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