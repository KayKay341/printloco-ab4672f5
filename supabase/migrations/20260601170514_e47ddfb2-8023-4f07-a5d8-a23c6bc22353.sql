
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_city_signup_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_printer_order_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_printer_rating() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_owner_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_printer_quality() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.compute_quality_score(public.printers) FROM PUBLIC;
