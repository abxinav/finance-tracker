import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import GoogleCallbackHandler from './GoogleCallbackHandler';

function CallbackFallback() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
      <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
      <p className="text-gray-600">Preparing your connection...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Suspense fallback={<CallbackFallback />}>
        <GoogleCallbackHandler />
      </Suspense>
    </div>
  );
}
