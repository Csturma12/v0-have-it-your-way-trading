-- Create allowed_users table for invite-only access control
-- Users must be in this table to sign up/access the app

CREATE TABLE IF NOT EXISTS public.allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  invited_by TEXT,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  registered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Add RLS policies
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view allowed_users (admins will check this)
CREATE POLICY "Admins can view allowed_users" ON public.allowed_users 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users au 
      WHERE au.email = auth.jwt() ->> 'email' AND au.is_admin = true
    )
  );

-- Only admins can insert new allowed users
CREATE POLICY "Admins can insert allowed_users" ON public.allowed_users 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allowed_users au 
      WHERE au.email = auth.jwt() ->> 'email' AND au.is_admin = true
    )
  );

-- Only admins can update allowed users
CREATE POLICY "Admins can update allowed_users" ON public.allowed_users 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users au 
      WHERE au.email = auth.jwt() ->> 'email' AND au.is_admin = true
    )
  );

-- Only admins can delete allowed users
CREATE POLICY "Admins can delete allowed_users" ON public.allowed_users 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users au 
      WHERE au.email = auth.jwt() ->> 'email' AND au.is_admin = true
    )
  );

-- Insert the first admin user (update this email to your email)
INSERT INTO public.allowed_users (email, is_admin, invited_by, notes)
VALUES ('chrissturma12@gmail.com', true, 'system', 'Initial admin user')
ON CONFLICT (email) DO UPDATE SET is_admin = true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON public.allowed_users(email);
