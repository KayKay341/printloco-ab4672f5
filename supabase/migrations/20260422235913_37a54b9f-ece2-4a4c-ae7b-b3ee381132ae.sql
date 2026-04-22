create or replace function public.read_email_batch(queue_name text, batch_size integer, vt integer)
returns table(msg_id bigint, read_ct integer, message jsonb)
language plpgsql
security definer
set search_path = public, pgmq
as $function$
begin
  return query select r.msg_id, r.read_ct, r.message from pgmq.read(queue_name, vt, batch_size) r;
exception when undefined_table then
  perform pgmq.create(queue_name);
  return;
end;
$function$;

create or replace function public.delete_email(queue_name text, message_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pgmq
as $function$
begin
  return pgmq.delete(queue_name, message_id);
exception when undefined_table then
  return false;
end;
$function$;

create or replace function public.enqueue_email(queue_name text, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pgmq
as $function$
begin
  return pgmq.send(queue_name, payload);
exception when undefined_table then
  perform pgmq.create(queue_name);
  return pgmq.send(queue_name, payload);
end;
$function$;

create or replace function public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pgmq
as $function$
declare new_id bigint;
begin
  select pgmq.send(dlq_name, payload) into new_id;
  perform pgmq.delete(source_queue, message_id);
  return new_id;
exception when undefined_table then
  begin perform pgmq.create(dlq_name); exception when others then null; end;
  select pgmq.send(dlq_name, payload) into new_id;
  begin perform pgmq.delete(source_queue, message_id); exception when undefined_table then null; end;
  return new_id;
end;
$function$;