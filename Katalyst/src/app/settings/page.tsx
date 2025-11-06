'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Key, Shield, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingApiKey();
  }, []);

  const checkExistingApiKey = async () => {
    try {
      setIsFetching(true);
      const response = await fetch('/api/user/api-key');
      
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
        setCurrentApiKey(data.maskedKey);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.startsWith('AIza')) {
      toast({
        title: "Invalid Format",
        description: "Google API keys should start with 'AIza'",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHasApiKey(true);
        setCurrentApiKey(data.maskedKey);
        setApiKey('');
        
        toast({
          title: "Success",
          description: "API key saved successfully",
        });
      } else {
        throw new Error(data.error || 'Failed to save API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete your API key? You will need to add it again to use fraud detection.')) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/api-key', {
        method: 'DELETE'
      });

      if (response.ok) {
        setHasApiKey(false);
        setCurrentApiKey(null);
        setApiKey('');
        
        toast({
          title: "Success",
          description: "API key deleted successfully",
        });
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#262624]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f403b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#262624] text-white">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Settings</h1>
          <p className="text-gray-400">
            Manage your fraud detection system configuration
          </p>
        </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <Card className="bg-[#1f1e1d] border-[#30302e]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0f403b]" />
              <CardTitle className="text-white">Google Gemini API Key</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              Your API key is encrypted and stored securely. It&apos;s used to power the fraud detection analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center gap-2 p-3 bg-[#30302e] rounded-lg">
              {hasApiKey ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-white">API Key Configured</span>
                  {currentApiKey && (
                    <code className="ml-auto text-xs bg-[#262624] text-[#0f403b] px-2 py-1 rounded">
                      {currentApiKey}
                    </code>
                  )}
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-white">No API Key Configured</span>
                </>
              )}
            </div>

            <Separator />

            {/* Add/Update API Key Form */}
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-white">
                  {hasApiKey ? 'Update API Key' : 'Add API Key'}
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10 bg-[#30302e] border-[#0f403b] text-white placeholder-gray-500"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Google API keys start with &quot;AIza&quot; and are typically 39 characters long
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || !apiKey.trim()}
                  className="bg-[#0f403b] hover:bg-[#ff6b7d] text-white"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {hasApiKey ? 'Update' : 'Save'} API Key
                </Button>
                
                {hasApiKey && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteApiKey}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete API Key
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-[#30302e]/50">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 text-[#0f403b]" />
              <div className="space-y-1">
                <p className="font-medium text-white">How to get a Google Gemini API Key:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#0f403b] hover:underline inline-flex items-center gap-1">
                    Google AI Studio <ExternalLink className="w-3 h-3" />
                  </a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click &quot;Create API Key&quot;</li>
                  <li>Copy the key and paste it above</li>
                </ol>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Security Information */}
        <Card className="bg-[#1f1e1d] border-[#30302e]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0f403b]" />
              <CardTitle className="text-white">Security & Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <p className="text-gray-300">Your API key is encrypted using AES-256-CBC before being stored</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <p className="text-gray-300">The key is only decrypted when making fraud detection requests</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <p className="text-gray-300">Your API key is never logged or shared with third parties</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
              <p className="text-gray-300">You can delete your API key at any time</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-[#0f403b] text-white hover:bg-[#30302e]"
          >
            Back
          </Button>
          <Button 
            onClick={() => window.location.href = '/chat'}
            className="bg-[#0f403b] hover:bg-[#ff6b7d] text-white"
          >
            Go to Chat
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
