
-- Update handle_new_user to accept role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
BEGIN
  v_role := COALESCE(
    (new.raw_user_meta_data->>'role')::app_role,
    'consultant'
  );

  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    v_role
  );
  
  IF new.raw_user_meta_data->>'role' = 'owner' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'consultant');
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'installer');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, v_role);
  END IF;
  
  RETURN new;
END;
$function$;

-- RLS: Customers can view leads matching their email
CREATE POLICY "Customers can view own leads"
ON public.leads FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- RLS: Customers can view proposals for their leads
CREATE POLICY "Customers can view own proposals"
ON public.proposals FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- RLS: Customers can view invoices for their leads
CREATE POLICY "Customers can view own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- RLS: Customers can view contracts for their leads
CREATE POLICY "Customers can view own contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- RLS: Customers can view SEAI applications for their leads
CREATE POLICY "Customers can view own SEAI applications"
ON public.seai_applications FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role)
  AND lead_id IN (SELECT id FROM public.leads WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);
