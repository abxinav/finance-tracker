'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  Link as LinkIcon,
  Unlink,
  ExternalLink
} from 'lucide-react';

export default function GoogleSheetsIntegration() {
  const [connected, setConnected] = useState(false);
  const [sheetId, setSheetId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importSheetId, setImportSheetId] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const { toast } = useToast();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/google/status');
      const data = await response.json();
      setConnected(data.connected);
      setSheetId(data.sheetId);
    } catch (error) {
      console.error('Failed to check Google Sheets status:', error);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      
      // Redirect to Google OAuth instead of popup (avoids CORS/CSP issues)
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Failed to connect to Google Sheets:', error);
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect to Google Sheets',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnected(false);
        setSheetId(null);
        toast({
          title: 'Disconnected',
          description: 'Google Sheets has been disconnected',
        });
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      setSheetId(data.spreadsheetId);
      toast({
        title: 'Export successful!',
        description: `${data.exportedCount} expenses exported to Google Sheets`,
      });

      setExportDialogOpen(false);

      // Show success with link
      setTimeout(() => {
        toast({
          title: '📊 Open your sheet',
          description: (
            <a
              href={data.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              View in Google Sheets <ExternalLink className="h-4 w-4" />
            </a>
          ),
        });
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export to Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: importSheetId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      toast({
        title: 'Import successful!',
        description: `Imported ${data.importedCount} expenses (${data.skippedCount} duplicates skipped)`,
      });

      setImportDialogOpen(false);
      setImportSheetId('');

      // Reload page to show imported expenses
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import from Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex items-center gap-3">
        <Button
          onClick={handleConnect}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
          data-testid="connect-google-sheets"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          Connect Google Sheets
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
        <CheckCircle2 className="h-4 w-4" />
        <span>Google Sheets Connected</span>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-2"
            data-testid="export-to-sheets"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="export-dialog">
          <DialogHeader>
            <DialogTitle>Export to Google Sheets</DialogTitle>
            <DialogDescription>
              Choose which expenses to export to your Google Sheet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="time-range" data-testid="time-range-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading}
              data-testid="confirm-export"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            data-testid="import-from-sheets"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="import-dialog">
          <DialogHeader>
            <DialogTitle>Import from Google Sheets</DialogTitle>
            <DialogDescription>
              Paste the Google Sheets URL or ID to import expenses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-id">Spreadsheet ID or URL</Label>
              <Input
                id="sheet-id"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={importSheetId}
                onChange={(e) => {
                  let value = e.target.value;
                  // Extract ID from URL if pasted
                  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                  if (match) {
                    value = match[1];
                  }
                  setImportSheetId(value);
                }}
                data-testid="import-sheet-id"
              />
              <p className="text-xs text-gray-500">
                Required columns: Date, Description, Category, Amount
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || !importSheetId}
              data-testid="confirm-import"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sheetId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank')}
          className="flex items-center gap-2"
          data-testid="open-sheet"
        >
          <ExternalLink className="h-4 w-4" />
          Open Sheet
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDisconnect}
        disabled={loading}
        className="flex items-center gap-2 text-gray-600"
        data-testid="disconnect-sheets"
      >
        <Unlink className="h-4 w-4" />
        Disconnect
      </Button>
    </div>
  );
}
