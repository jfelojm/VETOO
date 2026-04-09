-- ============================================================
-- TABLA: ai_conversations
-- Sesiones de conversación del agente IA por negocio/cliente
-- ============================================================

create table public.ai_conversations (
  id              uuid primary key default uuid_generate_v4(),
  session_id      text not null unique,         -- clave de lookup: "{negocio_id}:{client_phone}"
  negocio_id      uuid not null references public.negocios(id) on delete cascade,
  client_phone    text not null,                -- teléfono del cliente (E.164)
  messages_json   jsonb not null default '[]'::jsonb,  -- array de {role, content}
  state           text not null default 'active' check (state in ('active', 'escalated', 'closed')),
  escalated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index ai_conversations_session_id_idx on public.ai_conversations(session_id);
create index ai_conversations_negocio_id_idx on public.ai_conversations(negocio_id);

-- Auto-update updated_at
create or replace function public.set_ai_conversations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_ai_conversations_updated_at();

-- Row Level Security
alter table public.ai_conversations enable row level security;

-- Solo service role puede acceder (el webhook usa service role key)
create policy "service_role_full_access" on public.ai_conversations
  using (true)
  with check (true);
