
CREATE TABLE public.user_horses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  horse text NOT NULL,
  UNIQUE(user_id, horse)
);

ALTER TABLE public.user_horses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own horses"
ON public.user_horses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all user_horses"
ON public.user_horses
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

INSERT INTO public.user_horses (user_id, horse) VALUES ('040258c5-9833-425a-a596-7594f619fac3', 'Spotty');
