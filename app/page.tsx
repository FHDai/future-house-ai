import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <section className="max-w-3xl text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-gray-400">
          Future House Digital
        </p>

        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          Future House AI
        </h1>

        <p className="mt-6 text-lg leading-8 text-gray-300 sm:text-xl">
          The AI Operating System for Modern Agencies
        </p>

        <Link
          href="/login"
          className="mt-10 inline-block rounded-full bg-white px-8 py-4 font-medium text-black transition hover:bg-gray-200"
        >
          Get Started
        </Link>
      </section>
    </main>
  );
}