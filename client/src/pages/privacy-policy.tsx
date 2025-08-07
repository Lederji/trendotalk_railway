import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white pb-nav">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center sticky top-0 z-10">
        <button
          onClick={() => setLocation('/profile')}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="space-y-6 text-sm leading-relaxed text-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy for TrendoTalk</h1>
            <p className="text-gray-600">Effective Date: August 6, 2025</p>
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
            <p className="text-pink-800 font-medium">
              At TrendoTalk, your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your information when you use our mobile application.
            </p>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                Information We Collect
              </h2>
              <div className="ml-11 space-y-3">
                <p>We may collect the following types of information:</p>
                <div className="space-y-2">
                  <p><strong>Personal Information:</strong> Such as your username or profile picture (we do not require email, phone, or full name).</p>
                  <p><strong>Usage Data:</strong> Information on how you interact with the app (trends viewed, interactions, app preferences).</p>
                  <p><strong>Device Information:</strong> Your device type, OS version, and app version to improve performance and fix bugs.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                How We Use Your Information
              </h2>
              <div className="ml-11 space-y-3">
                <p>We use the data collected to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Provide and maintain our services.</li>
                  <li>Show you relevant trends and content.</li>
                  <li>Improve app functionality and fix errors or bugs.</li>
                  <li>Prevent fraud and ensure a safe environment.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                Data Sharing
              </h2>
              <div className="ml-11 space-y-3">
                <p>We do not sell or share your personal data with third parties except:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>When required by law.</li>
                  <li>To prevent fraud or harmful activity.</li>
                  <li>With service providers helping us run the app (analytics, crash reporting).</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
                Data Security
              </h2>
              <div className="ml-11">
                <p>We use modern security measures to protect your data. However, no system is 100% secure, and we encourage users to use the app responsibly.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">5</span>
                Children's Privacy
              </h2>
              <div className="ml-11">
                <p>TrendoTalk is not intended for users under the age of 13. We do not knowingly collect data from children under 13.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">6</span>
                Changes to This Policy
              </h2>
              <div className="ml-11">
                <p>We may update our Privacy Policy occasionally. You will be notified of any significant changes.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-pink-100 text-pink-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">7</span>
                Contact Us
              </h2>
              <div className="ml-11">
                <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
                  <p className="font-medium text-gray-900">Email: <a href="mailto:trendotalk@gmail.com" className="text-pink-600 hover:underline">trendotalk@gmail.com</a></p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}