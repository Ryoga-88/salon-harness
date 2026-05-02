import { AppShell } from '@/components/app-shell';

export default function CampaignsPage() {
  return (
    <AppShell>
      <h1 className="page-title">キャンペーン</h1>
      <section className="panel">
        <p className="muted">`/api/campaign-templates` と `/api/campaigns/from-template` で IG Engagement Gate を作成します。</p>
      </section>
    </AppShell>
  );
}
