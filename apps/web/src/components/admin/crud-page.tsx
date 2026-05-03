import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';

export type SalonOption = { id: string; name: string };

type CrudPageProps = {
  title: string;
  description: ReactNode;
  error?: string;
  notice?: string;
  children: ReactNode;
};

export function CrudPage({ title, description, error, notice, children }: CrudPageProps) {
  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <h1 className="page-title">{title}</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{description}</p>
        </div>
        <CrudMessages error={error} notice={notice} />
        {children}
      </div>
    </AppShell>
  );
}

export function CrudMessages({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && <div className="panel" style={{ borderColor: 'var(--rose-line)', color: 'var(--rose)' }}>{error}</div>}
      {notice && <div className="panel" style={{ borderColor: 'var(--green-line)', color: 'var(--green)' }}>{notice}</div>}
    </>
  );
}

export function CrudPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

export function SalonSelector({
  salons,
  value,
  onChange
}: {
  salons: SalonOption[];
  value: string;
  onChange: (salonId: string) => void;
}) {
  return (
    <CrudPanel title="対象サロン">
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="salon">サロン</label>
        <select id="salon" value={value} onChange={(e) => onChange(e.target.value)}>
          {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
        </select>
      </div>
    </CrudPanel>
  );
}

export function TableScroll({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: 'auto' }}>{children}</div>;
}

export function EmptyTableRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
}

export function MutedText({ children }: { children: ReactNode }) {
  return <span style={{ color: 'var(--muted)' }}>{children}</span>;
}
