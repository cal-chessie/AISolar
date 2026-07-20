-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'consultant', 'installer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  role app_role DEFAULT 'consultant',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create site_surveys table
CREATE TABLE public.site_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  surveyor_id UUID REFERENCES auth.users(id) NOT NULL,
  survey_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Roof details
  roof_type TEXT,
  roof_condition TEXT,
  roof_orientation TEXT,
  roof_pitch NUMERIC,
  roof_material TEXT,
  
  -- Shading and environment
  shading_analysis TEXT,
  nearby_obstructions TEXT,
  
  -- Electrical system
  electrical_panel_capacity TEXT,
  electrical_panel_condition TEXT,
  meter_location TEXT,
  grid_connection_type TEXT,
  
  -- System recommendations
  recommended_system_size NUMERIC,
  recommended_panel_count INTEGER,
  estimated_installation_cost NUMERIC,
  
  -- Installation notes
  installation_notes TEXT,
  special_requirements TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft',
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create survey_photos table for storing photos
CREATE TABLE public.survey_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.site_surveys(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create installers table for team management
CREATE TABLE public.installers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  specialization TEXT,
  certification_level TEXT,
  years_experience INTEGER,
  availability_status TEXT DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installers ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for site_surveys
CREATE POLICY "Authenticated users can view all surveys"
  ON public.site_surveys FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create surveys"
  ON public.site_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = surveyor_id);

CREATE POLICY "Surveyors can update their surveys"
  ON public.site_surveys FOR UPDATE
  TO authenticated
  USING (auth.uid() = surveyor_id);

CREATE POLICY "Admins can delete surveys"
  ON public.site_surveys FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for survey_photos
CREATE POLICY "Authenticated users can view survey photos"
  ON public.survey_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert survey photos"
  ON public.survey_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for installers
CREATE POLICY "Authenticated users can view installers"
  ON public.installers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage installers"
  ON public.installers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_surveys_updated_at
  BEFORE UPDATE ON public.site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installers_updated_at
  BEFORE UPDATE ON public.installers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'consultant'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'consultant');
  
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();