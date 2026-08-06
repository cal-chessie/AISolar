-- 20260806_widget_brand — make the embed widget resolve its branding from the
-- source key baked into /embed?src=…, so a national/county site shows ITS brand
-- (name, colour, dark) instead of the AISolar default. Fixes the "widget was
-- never wired properly" branding gap.

-- Solar Ireland: dark theme + amber (matches solarirelandgroup.ie).
update public.brands
set theme = jsonb_build_object(
  'primary',           '38 92% 50%',   -- amber (HSL triplet — the app reads hsl(var(--primary)))
  'primaryForeground', '0 0% 10%',     -- dark ink on amber
  'dark',              true,
  'logoUrl',           null,           -- name-only for now; drop in a logo URL later
  'calcSubtitle',      'Free AI bill analysis'
)
where id = 'b00daf6b-560e-4726-9f55-23810af3612b';

-- Public resolver: source key → the brand's PUBLIC branding only. SECURITY
-- DEFINER so the anon embed can read the safe branding for an ACTIVE source; it
-- exposes no tenant data and can't cross to another brand.
create or replace function public.resolve_widget_brand(p_source_key text)
returns table(name text, theme jsonb, domain text)
language sql
security definer
set search_path = public
stable
as $$
  select b.name, coalesce(b.theme, '{}'::jsonb), b.domain
  from public.sources s
  join public.brands b on b.id = s.brand_id
  where s.source_key = p_source_key and s.active and b.active
  limit 1;
$$;

grant execute on function public.resolve_widget_brand(text) to anon, authenticated;
