import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Tag, Layers, Activity, AlertCircle, Inbox } from 'lucide-react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { CampaignMetric, PromoCampaign, UserProfile } from '../../../types';

/**
 * Reports page focused on promo campaign performance.
 * Reads from the `campaign_metrics` view (one row per campaign) and decorates
 * with the original campaign metadata (name, status, dates).
 */
export default function Reports({ userProfile }: { userProfile: UserProfile }) {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [userProfile.company_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.getPromoCampaigns(userProfile.company_id!),
        api.getCampaignMetrics(userProfile.company_id!),
      ]);
      setCampaigns(c);
      setMetrics(m);
    } finally {
      setIsLoading(false);
    }
  };

  const rows = useMemo(() => {
    return metrics.map(m => {
      const meta = campaigns.find(c => c.id === m.campaign_id);
      const revenue = Number(m.gross_revenue || 0);
      const cogs = Number(m.total_cogs || 0);
      const margin = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
      return {
        ...m,
        meta,
        revenue,
        cogs,
        margin,
        units: Number(m.units_moved || 0),
        discount: Number(m.total_discount || 0),
        trx: Number(m.trx_count || 0),
      };
    });
  }, [metrics, campaigns]);

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => ({
      trx: acc.trx + r.trx,
      units: acc.units + r.units,
      discount: acc.discount + r.discount,
      revenue: acc.revenue + r.revenue,
      cogs: acc.cogs + r.cogs,
    }), { trx: 0, units: 0, discount: 0, revenue: 0, cogs: 0 });
  }, [rows]);

  const overallMargin = totals.revenue > 0 ? ((totals.revenue - totals.cogs) / totals.revenue) * 100 : 0;

  const topRevenue = [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const lowMargin = [...rows].filter(r => r.revenue > 0).sort((a, b) => a.margin - b.margin).slice(0, 5);
  const topUnits = [...rows].sort((a, b) => b.units - a.units).slice(0, 5);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Laporan Promo</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Kinerja kampanye, margin efektif, dan pergerakan tertinggi dari transaksi POS.</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard icon={<Activity className="w-3.5 h-3.5" />} label="Total Transaksi" value={totals.trx.toLocaleString()} />
        <KpiCard icon={<Layers className="w-3.5 h-3.5" />} label="Unit Terjual" value={totals.units.toLocaleString()} />
        <KpiCard icon={<Tag className="w-3.5 h-3.5" />} label="Diskon Diberikan" value={`Rp ${Math.round(totals.discount).toLocaleString()}`} />
        <KpiCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Pendapatan Promo" value={`Rp ${Math.round(totals.revenue).toLocaleString()}`} />
        <KpiCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Margin Efektif"
          value={`${overallMargin.toFixed(1)}%`}
          tone={totals.revenue > 0 && overallMargin < 10 ? 'danger' : 'ok'}
        />
      </div>

      {/* Empty state */}
      {!isLoading && rows.length === 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl py-16 text-center">
          <Inbox className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
          <p className="text-sm text-stone-600 dark:text-stone-300 font-medium mb-1">Belum ada data promo</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">Laporan akan terisi setelah transaksi POS menerapkan kampanye aktif.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RankCard
            title="Pendapatan Tertinggi"
            subtitle="Kampanye yang menghasilkan pendapatan terbanyak"
            rows={topRevenue}
            primary={r => `Rp ${Math.round(r.revenue).toLocaleString()}`}
            secondary={r => `${r.trx} trx · ${r.units} unit`}
          />
          <RankCard
            title="Volume Tertinggi"
            subtitle="Kampanye dengan penjualan unit terbanyak"
            rows={topUnits}
            primary={r => `${r.units.toLocaleString()} unit`}
            secondary={r => `Rp ${Math.round(r.revenue).toLocaleString()} · ${r.trx} trx`}
          />
          <RankCard
            title="Margin Terendah"
            subtitle="Tinjau penetapan harga pada kampanye ini"
            rows={lowMargin}
            primary={r => `${r.margin.toFixed(1)}%`}
            secondary={r => `Rp ${Math.round(r.discount).toLocaleString()} diskon`}
            tone={r => r.margin < 10 ? 'danger' : 'ok'}
          />
        </div>
      )}

      {/* Detail Table */}
      {rows.length > 0 && (
        <div className="mt-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Rincian per Kampanye</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Kampanye</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Trx</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Unit</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Diskon</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Pendapatan</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {rows.map(r => (
                  <tr key={r.campaign_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{r.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {r.meta?.is_active ? 'Aktif' : 'Tidak Aktif'}
                        {r.start_date && ` · ${new Date(r.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        {r.end_date && ` – ${new Date(r.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">{r.trx.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">{r.units.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums text-stone-700 dark:text-stone-300">Rp {Math.round(r.discount).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-sm tabular-nums text-stone-900 dark:text-stone-100">Rp {Math.round(r.revenue).toLocaleString()}</td>
                    <td className={cn(
                      "px-5 py-3.5 text-right text-sm font-medium tabular-nums",
                      r.revenue > 0 && r.margin < 10 ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-stone-100",
                    )}>
                      {r.revenue > 0 ? `${r.margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'ok' | 'danger';
}

function KpiCard({ icon, label, value, tone }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-1.5">
        {icon}<span>{label}</span>
      </div>
      <p className={cn(
        "text-lg font-semibold tabular-nums",
        tone === 'danger' ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-stone-100",
      )}>{value}</p>
    </div>
  );
}

interface RankRow {
  campaign_id: string;
  name: string;
  meta?: PromoCampaign;
  margin: number;
  revenue: number;
  units: number;
  trx: number;
  discount: number;
}

interface RankCardProps {
  title: string;
  subtitle: string;
  rows: RankRow[];
  primary: (row: RankRow) => string;
  secondary: (row: RankRow) => string;
  tone?: (row: RankRow) => 'ok' | 'danger';
}

function RankCard({ title, subtitle, rows, primary, secondary, tone }: RankCardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 mb-3">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-6">Tidak ada data</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, idx) => {
            const t = tone?.(r) ?? 'ok';
            return (
              <li key={r.campaign_id} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-[11px] font-semibold flex items-center justify-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{r.name}</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{secondary(r)}</p>
                </div>
                <span className={cn(
                  "text-sm font-medium tabular-nums shrink-0 inline-flex items-center gap-1",
                  t === 'danger' ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-stone-100",
                )}>
                  {t === 'danger' && <AlertCircle className="w-3.5 h-3.5" />}
                  {primary(r)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
