import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';
import { Flame, MapPin, Filter } from 'lucide-react';

// ---- Heat color scale: low -> hot ----
const HEAT = ['#1a1a1a', '#3a2a0a', '#7a4a0a', '#c47a14', '#f5b301', '#ffd84d'];

function heatColor(v: number, max: number): string {
  if (max <= 0) return HEAT[0];
  const idx = Math.min(HEAT.length - 1, Math.floor((v / max) * (HEAT.length - 1)));
  return HEAT[idx];
}

// IRE 26 counties + NI 6 (mirrors COUNTIES/ region split: roi / ni)
const COUNTIES = [
  'Carlow','Cavan','Clare','Cork','Donegal','Dublin','Galway','Kerry','Kildare','Kilkenny',
  'Laois','Leitrim','Limerick','Longford','Louth','Mayo','Meath','Monaghan','Offaly','Roscommon',
  'Sligo','Tipperary','Waterford','Westmeath','Wexford','Wicklow',
  'Antrim','Armagh','Derry','Down','Fermanagh','Tyrone',
];

// 9-stage CRM funnel (from Operational nervous system doc)
const FUNNEL_STAGES = [
  'bill_uploaded','estimate_sent','consultation_booked','consultation_completed',
  'proposal_sent','proposal_signed','deposit_paid','installed','won',
];

interface LaunchHeatmapsProps {
  className?: string;
}

export default function LaunchHeatmaps({ className }: LaunchHeatmapsProps) {
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState<Record<string, number>>({});
  const [countyCounts, setCountyCounts] = useState<Record<string, number>>({});
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calendar: activity log in last 16 weeks (every action writes a row)
      const since = subDays(startOfDay(new Date()), 112).toISOString();
      const [{ data: events }, { data: leads }] = await Promise.all([
        supabase.from('activity_logs').select('created_at').gte('created_at', since),
        supabase.from('leads').select('address, workflow_stage'),
      ]);

      // Calendar intensity = activities per day
      const cal: Record<string, number> = {};
      events?.forEach((e: { created_at: string }) => {
        const day = format(new Date(e.created_at), 'yyyy-MM-dd');
        cal[day] = (cal[day] || 0) + 1;
      });
      setCalendar(cal);

      // Geo: derive county from free-text address (leads has no county column yet)
      const cc: Record<string, number> = {};
      leads?.forEach((l: { address?: string | null }) => {
        const addr = (l.address || '').toLowerCase();
        const hit = COUNTIES.find((c) => addr.includes(c.toLowerCase()));
        if (hit) cc[hit] = (cc[hit] || 0) + 1;
      });
      setCountyCounts(cc);

      // Funnel: leads per workflow_stage
      const sc: Record<string, number> = {};
      FUNNEL_STAGES.forEach((s) => (sc[s] = 0));
      leads?.forEach((l: { workflow_stage?: string | null }) => {
        const s = l.workflow_stage || 'bill_uploaded';
        sc[s] = (sc[s] || 0) + 1;
      });
      setStageCounts(sc);
    } catch (err) {
      console.error('LaunchHeatmaps fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Build calendar grid (16 weeks x 7 days)
  const calMax = useMemo(() => Math.max(1, ...Object.values(calendar)), [calendar]);
  const weeks = useMemo(() => {
    const out: { day: string; count: number }[][] = [];
    const start = subDays(startOfDay(new Date()), 111);
    for (let w = 0; w < 16; w++) {
      const row: { day: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = format(date, 'yyyy-MM-dd');
        row.push({ day: key, count: calendar[key] || 0 });
      }
      out.push(row);
    }
    return out;
  }, [calendar]);

  const countyMax = useMemo(() => Math.max(1, ...Object.values(countyCounts)), [countyCounts]);
  const stageMax = useMemo(() => Math.max(1, ...Object.values(stageCounts)), [stageCounts]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader><CardTitle>Launch Heatmaps</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading…</p></CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* 1. LAUNCH CALENDAR HEATMAP */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" /> Launch Calendar — daily activity
          </CardTitle>
          <CardDescription>Last 16 weeks. Hotter = more outreach / proposals / bookings that day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell) => (
                  <div
                    key={cell.day}
                    title={`${cell.day}: ${cell.count} events`}
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: heatColor(cell.count, calMax) }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            Less
            {HEAT.map((c) => <div key={c} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}
            More
          </div>
        </CardContent>
      </Card>

      {/* 2. GEOGRAPHIC DENSITY HEATMAP */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" /> Geographic Density — leads per county
          </CardTitle>
          <CardDescription>Ireland (26) + NI (6). Hotter = more installer/customer concentration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1">
            {COUNTIES.map((c) => {
              const n = countyCounts[c] || 0;
              return (
                <div
                  key={c}
                  title={`${c}: ${n} leads`}
                  className="text-[10px] font-medium text-center py-2 rounded-sm text-black/80"
                  style={{ backgroundColor: heatColor(n, countyMax) }}
                >
                  {c}
                  <div className="text-[9px] opacity-70">{n || ''}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. FUNNEL HEATMAP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" /> Funnel Heat — where leads sit (9-stage)
          </CardTitle>
          <CardDescription>Cold/empty stages = leaks. Full stages = bottlenecks to clear.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {FUNNEL_STAGES.map((s) => {
              const n = stageCounts[s] || 0;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-40 text-xs text-muted-foreground shrink-0">{s.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-5 rounded-sm" style={{ backgroundColor: heatColor(n, stageMax) }} />
                  <span className="w-8 text-right text-xs font-medium">{n}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
