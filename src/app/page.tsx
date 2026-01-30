import { Button } from "@/components";
import { APP_NAME } from "@/constants";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Welcome to {APP_NAME}
        </h1>
        <p className="max-w-md text-lg text-gray-600 dark:text-gray-400">
          A modular Next.js starter with TypeScript, Tailwind CSS, and a clean
          project structure.
        </p>
        <div className="flex gap-4">
          <Button variant="primary">Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </div>
      </main>
    </div>
  );
}
