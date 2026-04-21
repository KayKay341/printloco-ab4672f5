
drop policy if exists "Anyone can join waitlist" on public.waitlist_signups;
create policy "Anyone can join waitlist" on public.waitlist_signups
  for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and role in ('customer','maker','nonprofit')
  );

drop policy if exists "Anyone can submit investor interest" on public.investor_leads;
create policy "Anyone can submit investor interest" on public.investor_leads
  for insert to anon, authenticated
  with check (
    char_length(email) between 3 and 320
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(name) between 1 and 200
  );
