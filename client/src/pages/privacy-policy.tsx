import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
        <h1 className="font-semibold text-lg">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="prose prose-gray max-w-none">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Effective Date: August 2025</p>
            <p className="mb-4">
              At TrendoTalk, your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your information when you use our mobile application.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Personal Information:</strong> Such as your username or profile picture (we do not require email, phone, or full name).</li>
              <li><strong>Usage Data:</strong> Information on how you interact with the app (trends viewed, interactions, app preferences).</li>
              <li><strong>Device Information:</strong> Your device type, OS version, and app version to improve performance and fix bugs.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-3">We use the data collected to:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Provide and maintain our services.</li>
              <li>Show you relevant trends and content.</li>
              <li>Improve app functionality and fix errors or bugs.</li>
              <li>Prevent fraud and ensure a safe environment.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. Data Sharing</h2>
            <p className="mb-3">We do not sell or share your personal data with third parties except:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>When required by law.</li>
              <li>To prevent fraud or harmful activity.</li>
              <li>With service providers helping us run the app (analytics, crash reporting).</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
            <p className="mb-3">
              We use modern security measures to protect your data. However, no system is 100% secure, and we encourage users to use the app responsibly.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Children's Privacy</h2>
            <p className="mb-3">
              TrendoTalk is not intended for users under the age of 13. We do not knowingly collect data from children under 13.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p className="mb-3">
              We may update our Privacy Policy occasionally. You will be notified of any significant changes.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
            <p className="mb-3">
              If you have any questions or concerns: email us at <a href="mailto:trendotalk@gmail.com" className="text-blue-600 hover:underline">trendotalk@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}