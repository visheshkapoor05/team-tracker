-- Creates a profiles row automatically whenever someone signs up, and
-- rejects the signup outright (at the database layer, not just client-side)
-- if the email isn't @easyrewardz.com. This is defense in depth: the signup
-- form also checks the domain client-side for a fast error message, but this
-- trigger is what actually protects the data even if that check is bypassed.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or new.email !~* '@easyrewardz\.com$' then
    raise exception 'Only @easyrewardz.com email addresses may sign up';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'employee'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
