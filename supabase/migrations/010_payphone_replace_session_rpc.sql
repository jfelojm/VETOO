-- Una sola ida a BD: reemplazar sesión de link PayPhone (evita delete+insert lento en serverless)

CREATE OR REPLACE FUNCTION public.replace_payphone_link_session(
  p_client_transaction_id text,
  p_negocio_id uuid,
  p_plan text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_plan NOT IN ('basic', 'pro') THEN
    RAISE EXCEPTION 'plan inválido';
  END IF;
  DELETE FROM public.payphone_link_sessions WHERE negocio_id = p_negocio_id;
  INSERT INTO public.payphone_link_sessions (client_transaction_id, negocio_id, plan)
  VALUES (p_client_transaction_id, p_negocio_id, p_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_payphone_link_session(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_payphone_link_session(text, uuid, text) TO service_role;
