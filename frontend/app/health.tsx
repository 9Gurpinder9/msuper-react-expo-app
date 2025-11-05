// frontend/app/health.tsx
import React from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';

export default function Health() {
  const [status, setStatus] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>('');

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';

  const check = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/healthz`);
      const json = await res.json();
      setStatus(`${res.status} ${JSON.stringify(json)}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  React.useEffect(() => {
    check();
  }, [check]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Backend Health Check</Text>
      <Text selectable>API_BASE: {API_BASE}</Text>
      {loading ? <ActivityIndicator /> : null}
      {status ? <Text selectable>Response: {status}</Text> : null}
      {error ? <Text selectable style={{ color: 'red' }}>Error: {error}</Text> : null}
      <Button title="Recheck" onPress={check} />
    </View>
  );
}

