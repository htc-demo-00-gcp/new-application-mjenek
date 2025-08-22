import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Cloud, ExternalLink } from 'lucide-react';

interface BucketInfo {
  storage: string;
  bucket: string | null;
  gcsConsoleUrl: string | null;
  isLocal: boolean;
}

export const BucketLink: React.FC = () => {
  const [bucketInfo, setBucketInfo] = useState<BucketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBucketInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/bucket-info');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBucketInfo(data.data);
      } catch (err) {
        console.error('Failed to fetch bucket info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bucket info');
      } finally {
        setLoading(false);
      }
    };

    fetchBucketInfo();
  }, []);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Storage & Debugging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Loading bucket information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Storage & Debugging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bucketInfo) {
    return null;
  }

  const isLocal = bucketInfo.isLocal;
  const gcsConsoleUrl = bucketInfo.gcsConsoleUrl;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-center">Storage & Debugging</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <Cloud className="h-6 w-6 text-blue-500" />
            <p className="text-sm text-muted-foreground">
              {isLocal 
                ? 'Local development mode - tasks stored in memory'
                : 'View tasks stored in Google Cloud Storage'
              }
            </p>
            <a
              href={gcsConsoleUrl || '#'}
              target={isLocal ? undefined : '_blank'}
              rel={isLocal ? undefined : 'noopener noreferrer'}
              className={`inline-flex items-center px-4 py-2 rounded-md transition-colors ${
                isLocal
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              onClick={isLocal ? (e) => e.preventDefault() : undefined}
            >
              <Cloud className="h-4 w-4 mr-2" />
              {isLocal ? 'Local Mode' : 'Open GCS Bucket'}
              {!isLocal && <ExternalLink className="h-4 w-4 ml-2" />}
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            Storage: <code className="bg-muted px-2 py-1 rounded">{bucketInfo.storage}</code>
            {bucketInfo.bucket && (
              <>
                <br />
                Bucket: <code className="bg-muted px-2 py-1 rounded">{bucketInfo.bucket}</code>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
