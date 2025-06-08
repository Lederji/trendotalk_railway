import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Mail, Home } from "lucide-react";

export default function BannedPage() {
  const [banReason, setBanReason] = useState<string>("");

  useEffect(() => {
    const reason = localStorage.getItem('bannedReason');
    if (reason) {
      try {
        const parsed = JSON.parse(reason);
        setBanReason(parsed.reason || "Policy violation");
      } catch {
        setBanReason("Policy violation");
      }
    }
  }, []);

  const handleGoHome = () => {
    localStorage.removeItem('bannedReason');
    localStorage.removeItem('sessionId');
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Account Suspended
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Your account has been temporarily suspended due to a violation of our community guidelines.
          </p>
          
          {banReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Reason:</strong> {banReason}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If you believe this suspension is in error, please contact our support team.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('mailto:support@trendotalk.com', '_blank')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
              
              <Button 
                variant="default" 
                className="w-full"
                onClick={handleGoHome}
              >
                <Home className="w-4 h-4 mr-2" />
                Return to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}