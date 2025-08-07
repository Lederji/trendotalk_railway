import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HelpSupportPage() {
  const [, setLocation] = useLocation();
  const [helpMessage, setHelpMessage] = useState('');
  const { toast } = useToast();

  // Send help message to admin
  const sendHelpMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', '/api/admin/help-request', {
        message: message,
        userEmail: 'trendotalk@gmail.com',
        subject: 'Help & Support Request'
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent to our support team. We'll get back to you soon!",
      });
      setHelpMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

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
        <h1 className="font-semibold text-lg">Help & Support</h1>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Get Help & Support
            </h2>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">📧 Direct Contact</h3>
              <p className="text-sm text-gray-600 mb-2">
                For immediate assistance, email us directly:
              </p>
              <a 
                href="mailto:trendotalk@gmail.com" 
                className="text-blue-600 hover:underline text-lg font-medium"
              >
                trendotalk@gmail.com
              </a>
            </div>
          </div>

          {/* Message Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">💬 Send us a Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your issue or question:
                </label>
                <Textarea
                  placeholder="Please provide details about your issue, question, or feedback. Our support team will get back to you as soon as possible..."
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  className="w-full min-h-[120px]"
                />
              </div>
              
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => sendHelpMutation.mutate(helpMessage)}
                disabled={sendHelpMutation.isPending || !helpMessage.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendHelpMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">❓ Common Questions</h3>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">How do I make voice calls?</h4>
                <p className="text-sm text-gray-600">
                  Simply go to any chat and tap the call button. No permission setup required!
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">How does Circle vibes work?</h4>
                <p className="text-sm text-gray-600">
                  Circle vibes are private posts visible only to your friends (users you chat with).
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Can I use the app offline?</h4>
                <p className="text-sm text-gray-600">
                  Yes! Previously loaded posts and media are available offline for seamless browsing.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">How do I report inappropriate content?</h4>
                <p className="text-sm text-gray-600">
                  Visit any user's profile and use the report option from the menu.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Hours */}
          <div className="text-center text-gray-500 text-sm">
            <p>Our support team typically responds within 24 hours</p>
            <p className="mt-1">Thank you for using TrendoTalk! 💙</p>
          </div>
        </div>
      </div>
    </div>
  );
}