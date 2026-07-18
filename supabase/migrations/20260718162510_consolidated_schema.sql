  create table "public"."chat_usage" (
    "user_id" uuid not null,
    "usage_date" date not null default CURRENT_DATE,
    "message_count" integer not null default 0
      );


alter table "public"."chat_usage" enable row level security;


  create table "public"."health_data_raw" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "week_start" date not null,
    "workouts" jsonb not null default '[]'::jsonb,
    "sleep" jsonb not null default '[]'::jsonb,
    "steps" integer not null default 0,
    "synced_at" timestamp with time zone not null default now()
      );


alter table "public"."health_data_raw" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" text not null,
    "content" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."pet_progression" (
    "user_id" uuid not null,
    "total_xp" integer not null default 0,
    "current_stage" text not null default 'JEUNE_CHIOT'::text,
    "stage_entered_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."pet_progression" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "first_name" text,
    "main_sports" text[],
    "weekly_activity_goal" integer default 4,
    "sleep_goal" numeric default 8.0,
    "onboarding_completed" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "athlete_profile" text,
    "plan" text not null default 'free'::text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."weekly_scores" (
    "user_id" uuid not null,
    "week_start" date not null,
    "score" integer not null,
    "status" text not null,
    "breakdown" jsonb not null,
    "computed_at" timestamp with time zone not null default now()
      );


alter table "public"."weekly_scores" enable row level security;


  create table "public"."xp_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "week_start" date not null,
    "xp_awarded" integer not null,
    "breakdown" jsonb not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."xp_transactions" enable row level security;

CREATE UNIQUE INDEX chat_usage_pkey ON public.chat_usage USING btree (user_id, usage_date);

CREATE UNIQUE INDEX health_data_raw_pkey ON public.health_data_raw USING btree (id);

CREATE UNIQUE INDEX health_data_raw_user_id_week_start_key ON public.health_data_raw USING btree (user_id, week_start);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE INDEX messages_user_id_created_at_idx ON public.messages USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX pet_progression_pkey ON public.pet_progression USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX weekly_scores_pkey ON public.weekly_scores USING btree (user_id, week_start);

CREATE UNIQUE INDEX xp_transactions_pkey ON public.xp_transactions USING btree (id);

CREATE UNIQUE INDEX xp_transactions_user_id_week_start_key ON public.xp_transactions USING btree (user_id, week_start);

alter table "public"."chat_usage" add constraint "chat_usage_pkey" PRIMARY KEY using index "chat_usage_pkey";

alter table "public"."health_data_raw" add constraint "health_data_raw_pkey" PRIMARY KEY using index "health_data_raw_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."pet_progression" add constraint "pet_progression_pkey" PRIMARY KEY using index "pet_progression_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."weekly_scores" add constraint "weekly_scores_pkey" PRIMARY KEY using index "weekly_scores_pkey";

alter table "public"."xp_transactions" add constraint "xp_transactions_pkey" PRIMARY KEY using index "xp_transactions_pkey";

alter table "public"."chat_usage" add constraint "chat_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."chat_usage" validate constraint "chat_usage_user_id_fkey";

alter table "public"."health_data_raw" add constraint "health_data_raw_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."health_data_raw" validate constraint "health_data_raw_user_id_fkey";

alter table "public"."health_data_raw" add constraint "health_data_raw_user_id_week_start_key" UNIQUE using index "health_data_raw_user_id_week_start_key";

alter table "public"."messages" add constraint "messages_role_check" CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_role_check";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

alter table "public"."pet_progression" add constraint "pet_progression_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."pet_progression" validate constraint "pet_progression_user_id_fkey";

alter table "public"."pet_progression" add constraint "valid_stage" CHECK ((current_stage = ANY (ARRAY['JEUNE_CHIOT'::text, 'CHIOT'::text, 'ADULTE_ACTIF'::text, 'VÉTÉRAN'::text, 'ATHLÈTE_ÉLITE'::text]))) not valid;

alter table "public"."pet_progression" validate constraint "valid_stage";

alter table "public"."profiles" add constraint "profiles_athlete_profile_check" CHECK ((athlete_profile = ANY (ARRAY['beginner'::text, 'regular'::text, 'serious'::text, 'competition'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_athlete_profile_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."weekly_scores" add constraint "weekly_scores_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."weekly_scores" validate constraint "weekly_scores_user_id_fkey";

alter table "public"."xp_transactions" add constraint "xp_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."xp_transactions" validate constraint "xp_transactions_user_id_fkey";

alter table "public"."xp_transactions" add constraint "xp_transactions_user_id_week_start_key" UNIQUE using index "xp_transactions_user_id_week_start_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_chat_usage(p_user_id uuid, p_limit integer)
 RETURNS TABLE(allowed boolean, current_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  declare
    v_count int;
    v_plan  text;
  begin
    select plan into v_plan from profiles where id = p_user_id;

    if v_plan = 'pro' then
      return query select true, 0;
      return;
    end if;

    insert into chat_usage (user_id, usage_date, message_count)
    values (p_user_id, current_date, 1)
    on conflict (user_id, usage_date)
    do update set message_count = chat_usage.message_count + 1
    returning message_count into v_count;

    return query select (v_count <= p_limit), v_count;
  end;
  $function$
;

grant delete on table "public"."chat_usage" to "anon";

grant insert on table "public"."chat_usage" to "anon";

grant references on table "public"."chat_usage" to "anon";

grant select on table "public"."chat_usage" to "anon";

grant trigger on table "public"."chat_usage" to "anon";

grant truncate on table "public"."chat_usage" to "anon";

grant update on table "public"."chat_usage" to "anon";

grant delete on table "public"."chat_usage" to "authenticated";

grant insert on table "public"."chat_usage" to "authenticated";

grant references on table "public"."chat_usage" to "authenticated";

grant select on table "public"."chat_usage" to "authenticated";

grant trigger on table "public"."chat_usage" to "authenticated";

grant truncate on table "public"."chat_usage" to "authenticated";

grant update on table "public"."chat_usage" to "authenticated";

grant delete on table "public"."chat_usage" to "service_role";

grant insert on table "public"."chat_usage" to "service_role";

grant references on table "public"."chat_usage" to "service_role";

grant select on table "public"."chat_usage" to "service_role";

grant trigger on table "public"."chat_usage" to "service_role";

grant truncate on table "public"."chat_usage" to "service_role";

grant update on table "public"."chat_usage" to "service_role";

grant delete on table "public"."health_data_raw" to "anon";

grant insert on table "public"."health_data_raw" to "anon";

grant references on table "public"."health_data_raw" to "anon";

grant select on table "public"."health_data_raw" to "anon";

grant trigger on table "public"."health_data_raw" to "anon";

grant truncate on table "public"."health_data_raw" to "anon";

grant update on table "public"."health_data_raw" to "anon";

grant delete on table "public"."health_data_raw" to "authenticated";

grant insert on table "public"."health_data_raw" to "authenticated";

grant references on table "public"."health_data_raw" to "authenticated";

grant select on table "public"."health_data_raw" to "authenticated";

grant trigger on table "public"."health_data_raw" to "authenticated";

grant truncate on table "public"."health_data_raw" to "authenticated";

grant update on table "public"."health_data_raw" to "authenticated";

grant delete on table "public"."health_data_raw" to "service_role";

grant insert on table "public"."health_data_raw" to "service_role";

grant references on table "public"."health_data_raw" to "service_role";

grant select on table "public"."health_data_raw" to "service_role";

grant trigger on table "public"."health_data_raw" to "service_role";

grant truncate on table "public"."health_data_raw" to "service_role";

grant update on table "public"."health_data_raw" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."pet_progression" to "anon";

grant insert on table "public"."pet_progression" to "anon";

grant references on table "public"."pet_progression" to "anon";

grant select on table "public"."pet_progression" to "anon";

grant trigger on table "public"."pet_progression" to "anon";

grant truncate on table "public"."pet_progression" to "anon";

grant update on table "public"."pet_progression" to "anon";

grant delete on table "public"."pet_progression" to "authenticated";

grant insert on table "public"."pet_progression" to "authenticated";

grant references on table "public"."pet_progression" to "authenticated";

grant select on table "public"."pet_progression" to "authenticated";

grant trigger on table "public"."pet_progression" to "authenticated";

grant truncate on table "public"."pet_progression" to "authenticated";

grant update on table "public"."pet_progression" to "authenticated";

grant delete on table "public"."pet_progression" to "service_role";

grant insert on table "public"."pet_progression" to "service_role";

grant references on table "public"."pet_progression" to "service_role";

grant select on table "public"."pet_progression" to "service_role";

grant trigger on table "public"."pet_progression" to "service_role";

grant truncate on table "public"."pet_progression" to "service_role";

grant update on table "public"."pet_progression" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."weekly_scores" to "anon";

grant insert on table "public"."weekly_scores" to "anon";

grant references on table "public"."weekly_scores" to "anon";

grant select on table "public"."weekly_scores" to "anon";

grant trigger on table "public"."weekly_scores" to "anon";

grant truncate on table "public"."weekly_scores" to "anon";

grant update on table "public"."weekly_scores" to "anon";

grant delete on table "public"."weekly_scores" to "authenticated";

grant insert on table "public"."weekly_scores" to "authenticated";

grant references on table "public"."weekly_scores" to "authenticated";

grant select on table "public"."weekly_scores" to "authenticated";

grant trigger on table "public"."weekly_scores" to "authenticated";

grant truncate on table "public"."weekly_scores" to "authenticated";

grant update on table "public"."weekly_scores" to "authenticated";

grant delete on table "public"."weekly_scores" to "service_role";

grant insert on table "public"."weekly_scores" to "service_role";

grant references on table "public"."weekly_scores" to "service_role";

grant select on table "public"."weekly_scores" to "service_role";

grant trigger on table "public"."weekly_scores" to "service_role";

grant truncate on table "public"."weekly_scores" to "service_role";

grant update on table "public"."weekly_scores" to "service_role";

grant delete on table "public"."xp_transactions" to "anon";

grant insert on table "public"."xp_transactions" to "anon";

grant references on table "public"."xp_transactions" to "anon";

grant select on table "public"."xp_transactions" to "anon";

grant trigger on table "public"."xp_transactions" to "anon";

grant truncate on table "public"."xp_transactions" to "anon";

grant update on table "public"."xp_transactions" to "anon";

grant delete on table "public"."xp_transactions" to "authenticated";

grant insert on table "public"."xp_transactions" to "authenticated";

grant references on table "public"."xp_transactions" to "authenticated";

grant select on table "public"."xp_transactions" to "authenticated";

grant trigger on table "public"."xp_transactions" to "authenticated";

grant truncate on table "public"."xp_transactions" to "authenticated";

grant update on table "public"."xp_transactions" to "authenticated";

grant delete on table "public"."xp_transactions" to "service_role";

grant insert on table "public"."xp_transactions" to "service_role";

grant references on table "public"."xp_transactions" to "service_role";

grant select on table "public"."xp_transactions" to "service_role";

grant trigger on table "public"."xp_transactions" to "service_role";

grant truncate on table "public"."xp_transactions" to "service_role";

grant update on table "public"."xp_transactions" to "service_role";


  create policy "Users manage own health data"
  on "public"."health_data_raw"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "user owns their health data"
  on "public"."health_data_raw"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can insert own messages"
  on "public"."messages"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can read own messages"
  on "public"."messages"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user can read their own progression"
  on "public"."pet_progression"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users read own scores"
  on "public"."weekly_scores"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user can read their own score"
  on "public"."weekly_scores"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "user can read their own xp transactions"
  on "public"."xp_transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
