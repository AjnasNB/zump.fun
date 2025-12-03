/**
 * Supabase Test Page
 * Test Supabase connection and operations
 */

import { useState } from 'react';
import { Container, Card, Stack, Button, Typography, Alert, Box } from '@mui/material';
import { getSupabaseService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../config/supabase';

export default function SupabaseTest() {
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      // Check configuration
      const configured = isSupabaseConfigured();
      if (!configured) {
        setError('Supabase is not configured. Check .env file.');
        return;
      }

      setResult('Supabase is configured ✓\n');

      // Test fetching all tokens
      const supabaseService = getSupabaseService();
      const tokens = await supabaseService.getAllTokenMetadata();
      
      setResult(prev => prev + `\nFound ${tokens.length} tokens in database\n`);
      
      if (tokens.length > 0) {
        setResult(prev => prev + '\nLatest tokens:\n' + 
          tokens.slice(0, 5).map(t => 
            `- ${t.name} (${t.symbol}) at ${t.token_address}`
          ).join('\n')
        );
      }
    } catch (err) {
      console.error('Supabase test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testCreateMetadata = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      const supabaseService = getSupabaseService();
      
      // Create test metadata
      const testMetadata = {
        token_address: `0xtest${Date.now()}`,
        pool_address: `0xpool${Date.now()}`,
        launch_id: String(Date.now()),
        name: 'Test Token',
        symbol: 'TEST',
        description: 'This is a test token',
        image_url: null,
        creator_address: '0xtest_creator',
        tags: ['test'],
        website_url: null,
        twitter_url: null,
        telegram_url: null,
      };

      console.log('Creating test metadata:', testMetadata);
      const created = await supabaseService.createTokenMetadata(testMetadata);
      
      setResult(`Test metadata created successfully!\n\n${JSON.stringify(created, null, 2)}`);
    } catch (err) {
      console.error('Create metadata error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Stack spacing={3} sx={{ py: 5 }}>
        <Typography variant="h3">Supabase Connection Test</Typography>

        <Card sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Button
              variant="contained"
              onClick={testConnection}
              disabled={loading}
            >
              Test Connection & Fetch Tokens
            </Button>

            <Button
              variant="outlined"
              onClick={testCreateMetadata}
              disabled={loading}
            >
              Test Create Metadata
            </Button>

            {error && (
              <Alert severity="error">
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {error}
                </Typography>
              </Alert>
            )}

            {result && (
              <Alert severity="success">
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {result}
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Environment Variables:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                REACT_APP_SUPABASE_URL: {process.env.REACT_APP_SUPABASE_URL ? '✓ Set' : '✗ Not set'}
                {'\n'}
                REACT_APP_SUPABASE_ANON_KEY: {process.env.REACT_APP_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'}
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
