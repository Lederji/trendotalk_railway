import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function TermsConditions() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">Terms & Conditions</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="prose prose-gray max-w-none">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Effective Date: August 2025</p>
            <p className="mb-4">
              By using TrendoTalk, you agree to be bound by the following terms:
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Use of Service</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>You must be at least 13 years old to use this app.</li>
              <li>You agree not to use the app for illegal activities or to spread hate, violence, or harassment.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Content</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>You are responsible for the content you share (text, media, comments).</li>
              <li>TrendoTalk reserves the right to remove inappropriate or harmful content without prior notice.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Conduct</h2>
            <p className="mb-3">You agree:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Not to impersonate others.</li>
              <li>Not to use bots or scripts to access or interact with the app.</li>
              <li>Not to spam or harm the experience of other users.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Intellectual Property</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>All trademarks, app design, and content are property of TrendoTalk.</li>
              <li>You may not copy, modify, or distribute app content without written permission.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Account Suspension</h2>
            <p className="mb-3">
              We may suspend or terminate accounts that violate our policies or terms.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Disclaimer</h2>
            <p className="mb-3">
              TrendoTalk is provided "as is." We do not guarantee uninterrupted service or that all features will always be available.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Updates</h2>
            <p className="mb-3">
              We may update these terms from time to time. Continued use of the app means you accept the new terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}