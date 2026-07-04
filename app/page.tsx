import Image from "next/image";

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Environment Check</h1>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      <p>Vultr API Key: {process.env.VULTR_API_KEY ? '✅ Loaded' : '❌ Missing'}</p>
    </main>
  );
}
