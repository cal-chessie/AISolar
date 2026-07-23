/**
 * agentAttribution — which of the ten agents did a thing, from its summary.
 *
 * One heuristic, one home (was private to CeoWindow; the client timeline
 * needs it too — Cal: "all of the agents involved and all of the touchpoints
 * should be logged in the timeline"). Replaced by real agent ids on the
 * kernel events at launch.
 */
export function agentFor(summary: string): string {
  const s = (summary ?? '').toLowerCase();
  if (/draft|proposal/.test(s)) return 'The drafter';
  if (/grant|seai/.test(s)) return 'The grants clerk';
  if (/book|schedul|survey/.test(s)) return 'The scheduler';
  if (/invoice|deposit|payment/.test(s)) return 'The bookkeeper';
  if (/remind|follow|chase|t-\d/.test(s)) return 'The chaser';
  if (/intake|acknowledge|score/.test(s)) return 'The greeter';
  if (/digest|update/.test(s)) return 'The correspondent';
  if (/warranty|handover/.test(s)) return 'The closer';
  if (/install.*sched|materials ordered|crew/.test(s)) return 'The coordinator';
  if (/stale|escalat/.test(s)) return 'The watchdog';
  return 'AITeam';
}

/** Distinct named agents that touched this set of touchpoints, in order of appearance. */
export function agentsInvolved(touchpoints: Array<{ actor?: string; summary?: string }>): string[] {
  const seen: string[] = [];
  for (const tp of touchpoints) {
    if (tp.actor !== 'agent') continue;
    const name = agentFor(tp.summary ?? '');
    if (!seen.includes(name)) seen.push(name);
  }
  return seen;
}
