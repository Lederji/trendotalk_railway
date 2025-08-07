import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

function AboutPage() {
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
        <h1 className="font-semibold text-lg">About TrendoTalk</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <div className="prose prose-gray max-w-none">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              About TrendoTalk
            </h2>
            
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
              <p className="text-gray-700 leading-relaxed mb-4">
                TrendoTalk is an innovative platform designed to keep you connected with the pulse of the internet. Our goal is to bring users closer to real-time trends, viral content, and social discussions happening across the digital world.
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                Whether it's the latest news, viral videos, memes, fashion, or global events — TrendoTalk ensures you stay updated and engaged. It's more than just an app — it's your window into what's buzzing across the globe.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                We also aim to provide users with a platform to share, connect, and express themselves in a safe, respectful, and trending environment. With a focus on simplicity, speed, and fun, TrendoTalk continues to evolve based on what matters most to our users.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-pink-600">🌟 Our Mission</h3>
              <p className="text-gray-600 text-sm">
                To create a vibrant community where users can discover trending content, share their thoughts, and connect with like-minded individuals from around the world.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-600">🚀 Our Vision</h3>
              <p className="text-gray-600 text-sm">
                To become the go-to platform for real-time trends and social interactions, making the world more connected and informed.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Key Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Real-time trending content
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Social interaction features
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Circle vibes for friends
                </li>
              </ul>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Voice calling functionality
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Offline content access
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Content creation tools
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Join the Community</h3>
            <p className="text-sm opacity-90">
              Be part of the TrendoTalk family and stay connected with what's trending worldwide!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;