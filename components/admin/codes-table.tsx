'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NewCodeDialog } from './new-code-dialog';

interface Row {
  id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export function CodesTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/codes');
    const j = await r.json();
    setRows(j.codes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(id: string) {
    if (!confirm('Revoke this code?')) return;
    const r = await fetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Revoked');
      load();
    } else {
      toast.error('Revoke failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Viewer codes</h2>
        <NewCodeDialog onCreated={load} />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Label</th>
              <th>Created</th>
              <th>Last seen</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.label}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : '—'}</td>
                <td>{r.revoked_at ? <span className="text-red-500">revoked</span> : 'active'}</td>
                <td className="text-right">
                  {!r.revoked_at && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(r.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
