import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsConditions() {
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
        <h1 className="font-semibold text-lg">Terms & Conditions</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="space-y-6 text-sm leading-relaxed text-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms and Conditions for TrendoTalk</h1>
            <p className="text-gray-600">Effective Date: August 6, 2025</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 font-medium">
              By using TrendoTalk, you agree to be bound by the following terms and conditions:
            </p>
          </div>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                Use of Service
              </h2>
              <div className="ml-11 space-y-2">
                <p>• You must be at least 13 years old to use this app.</p>
                <p>• You agree not to use the app for illegal activities or to spread hate, violence, or harassment.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                Content
              </h2>
              <div className="ml-11 space-y-2">
                <p>• You are responsible for the content you share (text, media, comments).</p>
                <p>• TrendoTalk reserves the right to remove inappropriate or harmful content without prior notice.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                User Conduct
              </h2>
              <div className="ml-11 space-y-2">
                <p>You agree:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Not to impersonate others.</li>
                  <li>Not to use bots or scripts to access or interact with the app.</li>
                  <li>Not to spam or harm the experience of other users.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
                Intellectual Property
              </h2>
              <div className="ml-11 space-y-2">
                <p>• All trademarks, app design, and content are property of TrendoTalk.</p>
                <p>• You may not copy, modify, or distribute app content without written permission.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">5</span>
                Account Suspension
              </h2>
              <div className="ml-11">
                <p>We may suspend or terminate accounts that violate our policies or terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">6</span>
                Disclaimer
              </h2>
              <div className="ml-11">
                <p>TrendoTalk is provided "as is." We do not guarantee uninterrupted service or that all features will always be available.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">7</span>
                Updates
              </h2>
              <div className="ml-11">
                <p>We may update these terms from time to time. Continued use of the app means you accept the new terms.</p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-medium text-gray-900 mb-2">Contact Information</p>
              <p className="text-gray-700">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="font-medium text-gray-900 mt-2">
                Email: <a href="mailto:trendotalk@gmail.com" className="text-blue-600 hover:underline">trendotalk@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}