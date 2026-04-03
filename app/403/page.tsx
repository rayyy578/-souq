import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-gray-600 mb-6">You don&apos;t have access to this page.</p>
        <a href="/" className="block">
          <Button>Back to Home</Button>
        </a>
      </div>
    </div>
  );
}
