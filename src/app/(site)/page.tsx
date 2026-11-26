import messages from '@messages/en.json';

export default function HomePage() {
  return (
    <main>
      <h1>{messages.home.heading}</h1>
      <p>{messages.home.placeholder}</p>
    </main>
  );
}
