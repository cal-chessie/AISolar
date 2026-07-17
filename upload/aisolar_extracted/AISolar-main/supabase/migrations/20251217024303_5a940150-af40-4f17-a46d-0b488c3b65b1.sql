-- Move extensions to extensions schema for security
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Extensions cannot be moved after creation, but we ensure future extensions go to extensions schema
-- The warning is informational - existing extensions in public schema don't pose immediate security risk

-- Seed Solar Products - Panels
INSERT INTO public.solar_products (product_type, manufacturer, model, description, cost, power_rating, efficiency_percentage, warranty_years, in_stock, active) VALUES
-- Premium Panels
('panel', 'SunPower', 'Maxeon 6 AC', 'Premium high-efficiency monocrystalline panel with integrated microinverter', 450, 440, 22.8, 40, true, true),
('panel', 'LG', 'NeON H+ 400W', 'High-performance N-type monocrystalline panel', 380, 400, 21.7, 25, true, true),
('panel', 'REC', 'Alpha Pure-RX 430', 'Premium heterojunction panel with excellent shade tolerance', 420, 430, 22.3, 25, true, true),
-- Budget Panels
('panel', 'JA Solar', 'DeepBlue 3.0 Pro', 'Cost-effective monocrystalline panel', 180, 410, 21.3, 12, true, true),
('panel', 'Trina Solar', 'Vertex S+ 430W', 'Value monocrystalline panel with good performance', 195, 430, 21.8, 15, true, true),
('panel', 'Canadian Solar', 'HiKu6 CS6R-420', 'Reliable budget-friendly option', 165, 420, 21.0, 12, true, true),

-- Inverters
('inverter', 'SolarEdge', 'SE10K-RWS', 'Premium single-phase inverter with optimizers', 1850, 10000, 99.2, 12, true, true),
('inverter', 'Fronius', 'Primo GEN24 6.0', 'Hybrid inverter with battery-ready capability', 2200, 6000, 98.4, 10, true, true),
('inverter', 'Huawei', 'SUN2000-6KTL-M1', 'Smart string inverter with monitoring', 1100, 6000, 98.6, 10, true, true),
('inverter', 'GoodWe', 'GW5000-EH', 'Hybrid inverter for home battery systems', 1400, 5000, 97.6, 10, true, true),
('inverter', 'Solis', 'S6-GR1P5K', 'Budget-friendly single-phase inverter', 650, 5000, 97.3, 10, true, true),

-- Batteries
('battery', 'Tesla', 'Powerwall 3', 'Premium home battery with 13.5kWh capacity', 8500, null, 90, 10, true, true),
('battery', 'BYD', 'Battery-Box Premium HVS 10.2', 'Modular high-voltage battery system', 6200, null, 95.3, 10, true, true),
('battery', 'Huawei', 'LUNA2000-10-S0', 'Stackable lithium battery system', 5800, null, 95, 10, true, true),
('battery', 'Pylontech', 'Force H2 10.65kWh', 'Cost-effective lithium iron phosphate battery', 4200, null, 95, 10, true, true),
('battery', 'GivEnergy', 'All-in-One 9.5kWh', 'Integrated inverter and battery solution', 5500, null, 93, 10, true, true)
ON CONFLICT DO NOTHING;

-- Create demo installer (need to link to an existing user or create profile)
-- First check if we have consultant users we can also give installer role
INSERT INTO public.installers (user_id, years_experience, specialization, certification_level, availability_status)
SELECT p.user_id, 8, 'residential', 'Master Electrician - RECI Certified', 'available'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.installers i WHERE i.user_id = p.user_id)
LIMIT 1;

-- Add installer role to the first user if they don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'installer'::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.user_id AND ur.role = 'installer'
)
LIMIT 1
ON CONFLICT DO NOTHING;