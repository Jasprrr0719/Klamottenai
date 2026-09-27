export default async (req) => {
  return new Response(JSON.stringify({ message: "Hallo vom Backend!" }));
};