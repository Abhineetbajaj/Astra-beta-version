-- Supabase's project-level default privileges grant EXECUTE on new public-schema functions to anon
-- and authenticated as explicit grants, which the previous migration's `revoke ... from public` does
-- not remove. These two functions are service-role-only by design, so revoke those explicitly.

revoke execute on function public.claim_tts_generation(uuid, text, integer) from anon, authenticated;
revoke execute on function public.release_tts_generation(uuid, text) from anon, authenticated;
