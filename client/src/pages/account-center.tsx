import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Shield, Phone, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Header } from '@/components/layout/header';
import { useAuth } from '@/hooks/use-auth';

interface AccountStatus {
  status: 'live' | 'banned' | 'suspended';
  reason?: string;
  expiresAt?: string;
}

interface VerificationData {
  mobile?: string;
  email?: string;
  mobileVerified: boolean;
  emailVerified: boolean;
}

export default function AccountCenter() {
  const { user } = useAuth();
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showMobileOtp, setShowMobileOtp] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch account status
  const { data: accountStatus, isLoading: statusLoading } = useQuery<AccountStatus>({
    queryKey: ['/api/account/status'],
    enabled: !!user,
  });

  // Fetch verification data
  const { data: verificationData, isLoading: verificationLoading } = useQuery<VerificationData>({
    queryKey: ['/api/account/verification'],
    enabled: !!user,
  });

  // Send mobile OTP
  const sendMobileOtpMutation = useMutation({
    mutationFn: async (mobile: string) => {
      return apiRequest('/api/account/send-mobile-otp', 'POST', { mobile });
    },
    onSuccess: () => {
      setShowMobileOtp(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your mobile number",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    }
  });

  // Verify mobile OTP
  const verifyMobileOtpMutation = useMutation({
    mutationFn: async ({ mobile, otp }: { mobile: string; otp: string }) => {
      return apiRequest('/api/account/verify-mobile-otp', 'POST', { mobile, otp });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account/verification'] });
      setShowMobileOtp(false);
      setMobileOtp('');
      setNewMobile('');
      toast({
        title: "Mobile Verified",
        description: "Your mobile number has been verified successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    }
  });

  // Send email OTP
  const sendEmailOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log('Sending email OTP for:', email);
      const response = await apiRequest('POST', '/api/account/send-email-otp', { email });
      const result = await response.json();
      console.log('Email OTP result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Email OTP sent successfully:', data);
      setShowEmailOtp(true);
      toast({
        title: "OTP Sent",
        description: "Verification code sent to your email. Check the console for the OTP code.",
      });
    },
    onError: (error: any) => {
      console.error('Email OTP error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    }
  });

  // Verify email OTP
  const verifyEmailOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      console.log('Verifying email OTP for:', email, 'with OTP:', otp);
      const response = await apiRequest('POST', '/api/account/verify-email-otp', { email, otp });
      const result = await response.json();
      console.log('Email verification result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Email verified successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/account/verification'] });
      setShowEmailOtp(false);
      setEmailOtp('');
      setNewEmail('');
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully",
      });
    },
    onError: (error: any) => {
      console.error('Email verification error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Live</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" />Banned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (statusLoading || verificationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Account Center</h1>
          </div>

          <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Status
              </CardTitle>
              <CardDescription>
                Current status of your TrendoTalk account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(accountStatus?.status || 'live')}
                </div>
                {accountStatus?.reason && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="text-sm">{accountStatus.reason}</p>
                  </div>
                )}
              </div>
              {accountStatus?.expiresAt && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Account restriction expires: {new Date(accountStatus.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Mobile Number
              </CardTitle>
              <CardDescription>
                Verify your mobile number for enhanced security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationData?.mobile ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{verificationData.mobile}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {verificationData.mobileVerified ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </div>
                  </div>
                  {!verificationData.mobileVerified && (
                    <Button 
                      onClick={() => sendMobileOtpMutation.mutate(verificationData.mobile!)}
                      disabled={sendMobileOtpMutation.isPending}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="+1234567890"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => sendMobileOtpMutation.mutate(newMobile)}
                    disabled={!newMobile || sendMobileOtpMutation.isPending}
                    className="w-full"
                  >
                    Send OTP
                  </Button>
                </div>
              )}

              {showMobileOtp && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="mobileOtp">Enter OTP</Label>
                      <Input
                        id="mobileOtp"
                        type="text"
                        placeholder="123456"
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => verifyMobileOtpMutation.mutate({ 
                          mobile: newMobile || verificationData?.mobile!, 
                          otp: mobileOtp 
                        })}
                        disabled={!mobileOtp || verifyMobileOtpMutation.isPending}
                        className="flex-1"
                      >
                        Verify OTP
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowMobileOtp(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Email Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Address
              </CardTitle>
              <CardDescription>
                Verify your email address for account recovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationData?.email ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{verificationData.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {verificationData.emailVerified ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Verified</Badge>
                      )}
                    </div>
                  </div>
                  {!verificationData.emailVerified && (
                    <Button 
                      onClick={() => sendEmailOtpMutation.mutate(verificationData.email!)}
                      disabled={sendEmailOtpMutation.isPending}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={() => sendEmailOtpMutation.mutate(newEmail)}
                    disabled={!newEmail || sendEmailOtpMutation.isPending}
                    className="w-full"
                  >
                    Send OTP
                  </Button>
                </div>
              )}

              {showEmailOtp && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emailOtp">Enter OTP</Label>
                      <Input
                        id="emailOtp"
                        type="text"
                        placeholder="123456"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => verifyEmailOtpMutation.mutate({ 
                          email: newEmail || verificationData?.email!, 
                          otp: emailOtp 
                        })}
                        disabled={!emailOtp || verifyEmailOtpMutation.isPending}
                        className="flex-1"
                      >
                        Verify OTP
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowEmailOtp(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}