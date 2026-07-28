/**
 * monitoringHandoff — THE TROJAN HORSE.
 *
 * Every inverter brand has its own monitoring app; everywhere in the market
 * the installer manually says "download this, here's your login." Nobody
 * automates the handoff KEYED TO THE FITTED PRODUCT. We do: the field record
 * says what's actually on the wall → the coach walks the installer through
 * commissioning THAT unit → the customer gets one tap to the RIGHT app.
 * At VPP launch, "their app" becomes OUR app — same handoff, our door.
 *
 * Truth-pass: steps are the GENERIC commissioning sequence (true for every
 * brand); we never invent brand-specific menu paths we haven't verified.
 * The value is the RIGHT app identified automatically + the drill that never
 * gets skipped. Email SENDING wires at Sweep 8 (Postmark, both-ends
 * notification law) — until then everything here is draft/preview, honestly
 * labelled. Skills used: stop-slop on every string.
 */

export interface MonitoringApp {
  brand: string;      // e.g. 'SolaX'
  appName: string;    // e.g. 'SolaX Cloud'
  ios: string;        // App Store URL
  android: string;    // Play Store URL
}

/** Fitted model → the right monitoring app. Detection off the plate string
 *  the crew attested — NOT the proposal (the whole point). Extend per new
 *  catalog brands; default keeps the handoff honest when unknown. */
const APPS: Array<{ match: RegExp; app: MonitoringApp }> = [
  { match: /solax|x1-|x3-/i, app: { brand: 'SolaX', appName: 'SolaX Cloud', ios: 'https://apps.apple.com/app/solaxcloud/id1465090710', android: 'https://play.google.com/store/apps/details?id=com.solaxcloud.starter' } },
  { match: /solaredge|\bse\d/i, app: { brand: 'SolarEdge', appName: 'mySolarEdge', ios: 'https://apps.apple.com/app/mysolaredge/id1473952773', android: 'https://play.google.com/store/apps/details?id=com.solaredge.homeowner' } },
  { match: /enphase|iq\d/i, app: { brand: 'Enphase', appName: 'Enphase App', ios: 'https://apps.apple.com/app/enphase/id1497803579', android: 'https://play.google.com/store/apps/details?id=com.enphaseenergy.myenlighten' } },
  { match: /huawei|sun2000/i, app: { brand: 'Huawei', appName: 'FusionSolar', ios: 'https://apps.apple.com/app/fusionsolar/id1438500493', android: 'https://play.google.com/store/apps/details?id=com.huawei.smartpvms' } },
  { match: /sungrow|sg\d/i, app: { brand: 'Sungrow', appName: 'iSolarCloud', ios: 'https://apps.apple.com/app/isolarcloud/id1117482797', android: 'https://play.google.com/store/apps/details?id=com.isolarcloud.manager' } },
  { match: /growatt|mic\s?\d|mod\s?\d/i, app: { brand: 'Growatt', appName: 'ShinePhone', ios: 'https://apps.apple.com/app/shinephone/id959906720', android: 'https://play.google.com/store/apps/details?id=com.growatt.shinephone' } },
  { match: /goodwe|gw\d/i, app: { brand: 'GoodWe', appName: 'SEMS Portal', ios: 'https://apps.apple.com/app/sems-portal/id1441114006', android: 'https://play.google.com/store/apps/details?id=com.goodwe.sems' } },
  { match: /fronius|primo|symo/i, app: { brand: 'Fronius', appName: 'Solar.web', ios: 'https://apps.apple.com/app/fronius-solar-web/id929293213', android: 'https://play.google.com/store/apps/details?id=com.fronius.solarweb' } },
  { match: /sigen/i, app: { brand: 'Sigenergy', appName: 'mySigen', ios: 'https://apps.apple.com/app/mysigen/id6446070565', android: 'https://play.google.com/store/apps/details?id=com.sigenergy.sigenpower' } },
];

export const GENERIC_APP: MonitoringApp = { brand: 'the manufacturer', appName: "the manufacturer's monitoring app", ios: '', android: '' };

export function monitoringAppForModel(fittedModel: string): MonitoringApp {
  const hit = APPS.find(a => a.match.test(fittedModel));
  return hit?.app ?? GENERIC_APP;
}

/** The commissioning drill — generically true for every brand, in the order
 *  a crew actually works. The coach renders these against the FITTED unit. */
export function commissioningSteps(app: MonitoringApp, fittedModel: string): string[] {
  return [
    `Power the ${fittedModel} per the manual — AC + DC isolators on, wait for a clean status light.`,
    `Open ${app.appName} on YOUR phone (installer account) and add this site.`,
    `Connect the inverter (WiFi dongle / integrated — per its manual) and confirm it reports.`,
    `Watch generation: real kW on a live roof. No numbers, no leaving — that's the rule.`,
    `Set the export limitation you recorded above and confirm it stuck.`,
    `Add the CUSTOMER as the site owner with THEIR email — their app, their system.`,
  ];
}

/**
 * "Your system is live" — Cal's dictated copy (28 Jul), held VERBATIM in
 * intent. ⚠️ WORDING GATE before any real send: the SEAI-may-audit-before-
 * grant-release + hard-copies claims are UNVERIFIED (flag #2, build plan).
 * Verify on seai.ie, then this template ships. Sending wires at Sweep 8
 * (Postmark + magic link, both ends notified). */
export function systemLiveEmail(p: {
  customerFirst: string; fittedModel: string; app: MonitoringApp; installerCompany: string;
}): { subject: string; body: string } {
  const appLine = p.app.ios
    ? `Download ${p.app.appName} — one tap: iPhone ${p.app.ios} · Android ${p.app.android}`
    : `Your installer will hand you the monitoring app for your ${p.fittedModel}.`;
  return {
    subject: `${p.customerFirst}, your solar system is LIVE ☀️`,
    body: [
      `Hi ${p.customerFirst},`,
      ``,
      `Your ${p.fittedModel} is commissioned and generating. Watch it live:`,
      appLine,
      ``,
      `Your documents arrive on confirmation of final payment. Keep them safe —`,
      `SEAI may audit before releasing your grant. They'll always be in your`,
      `folder here, but SEAI want hard copies printed. Your installer has also`,
      `handed you your test certificates — keep those safe alongside.`,
      ``,
      `— ${p.installerCompany}`,
    ].join('\n'),
  };
}
