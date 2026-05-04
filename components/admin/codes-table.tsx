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
    if (!confirm('Break the wax seal? The bearer will lose access immediately.')) return;
    const r = await fetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Seal broken');
      load();
    } else {
      toast.error('Could not break seal');
    }
  }

  const active = rows.filter(r => !r.revoked_at).length;

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-muted-foreground">Section III</p>
          <h2 className="display mt-1 text-3xl">
            Sealed <span className="display-italic">keys</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? 'Opening the keybook…'
              : rows.length === 0
                ? 'The keybook is empty. Mint the first one.'
                : `${active} active · ${rows.length - active} revoked`}
          </p>
        </div>
        <NewCodeDialog onCreated={load} />
      </header>

      <div className="postal-rule" aria-hidden />

      {loading ? (
        <p className="telegram">·····························</p>
      ) : rows.length === 0 ? (
        <EmptyKeys />
      ) : (
        <div className="paper-card overflow-hidden rounded-sm">
          {/* Mobile cards */}
          <ul className="divide-y divide-dashed divide-border sm:hidden">
            {rows.map((r, i) => (
              <li key={r.id} className="ledger-row flex flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <span className="index-numeral text-xl">№{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-base">{r.label}</span>
                  </div>
                  <StatusSeal revoked={!!r.revoked_at} />
                </div>
                <p className="telegram">
                  minted {new Date(r.created_at).toLocaleDateString()}
                  {' · '}
                  {r.last_used_at
                    ? `last seen ${new Date(r.last_used_at).toLocaleDateString()}`
                    : 'never used'}
                </p>
                {!r.revoked_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(r.id)}
                    className="label-mono self-start text-muted-foreground hover:text-destructive"
                  >
                    Break seal
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop ledger */}
          <table className="hidden w-full sm:table">
            <thead>
              <tr className="text-left">
                <th className="label-mono px-5 py-3 text-muted-foreground">№</th>
                <th className="label-mono px-2 py-3 text-muted-foreground">Bearer</th>
                <th className="label-mono px-2 py-3 text-muted-foreground">Minted</th>
                <th className="label-mono px-2 py-3 text-muted-foreground">Last seen</th>
                <th className="label-mono px-2 py-3 text-muted-foreground">Seal</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border">
              {rows.map((r, i) => (
                <tr key={r.id} className="ledger-row">
                  <td className="px-5 py-3 align-top">
                    <span className="index-numeral text-xl">{String(i + 1).padStart(2, '0')}</span>
                  </td>
                  <td className="px-2 py-3 align-top">
                    <span className="text-base">{r.label}</span>
                  </td>
                  <td className="telegram px-2 py-3 align-top">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="telegram px-2 py-3 align-top">
                    {r.last_used_at
                      ? new Date(r.last_used_at).toLocaleString(undefined, {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '— never —'}
                  </td>
                  <td className="px-2 py-3 align-top">
                    <StatusSeal revoked={!!r.revoked_at} />
                  </td>
                  <td className="px-5 py-3 text-right align-top">
                    {!r.revoked_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revoke(r.id)}
                        className="label-mono text-muted-foreground hover:text-destructive"
                      >
                        Break seal
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusSeal({ revoked }: { revoked: boolean }) {
  if (revoked) {
    return (
      <span className="wax-seal text-muted-foreground line-through decoration-destructive/70 decoration-[1.5px]">
        revoked
      </span>
    );
  }
  return <span className="wax-seal text-primary">sealed</span>;
}

function EmptyKeys() {
  return (
    <div className="paper-card flex flex-col items-center gap-3 rounded-sm py-14 text-center">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden className="text-primary/70">
        <circle cx="16" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="24" r="2.5" fill="currentColor" />
        <path
          d="M24 24 L42 24 M36 24 L36 30 M40 24 L40 28"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <p className="display-italic text-xl">No keys yet.</p>
      <p className="text-sm text-muted-foreground">
        Mint a key for each trusted reader. Codes appear once — keep them safe.
      </p>
    </div>
  );
}
