-- Security hardening: set fixed search_path for SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (id, role)
  values (new.id, 'inackordering');
  return new;
end;
$function$;