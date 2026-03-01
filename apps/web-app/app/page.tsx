export default function HomePage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'not configured';

  return (
    <main>
      <h1>Ark Web App</h1>
      <p>NEXT_PUBLIC_API_BASE_URL: {apiBaseUrl}</p>
    </main>
  );
}
