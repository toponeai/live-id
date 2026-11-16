CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username ~ '^[A-Z0-9][A-Z0-9_.-]{1,19}$'),
  display_name text NOT NULL DEFAULT 'TOPONE',
  country_code text NOT NULL DEFAULT 'EG' CHECK (country_code ~ '^[A-Z]{2}$'),
  avatar_url text,
  discoverable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, username)
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can discover visible profiles" ON public.profiles FOR SELECT TO authenticated USING (discoverable OR user_id = auth.uid());
CREATE POLICY "Users update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.profile_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  language_code text NOT NULL DEFAULT 'ar' CHECK (language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  message_privacy text NOT NULL DEFAULT 'contacts' CHECK (message_privacy IN ('everyone', 'contacts')),
  allow_contact_requests boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profile_settings TO authenticated;
GRANT ALL ON public.profile_settings TO service_role;
ALTER TABLE public.profile_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own settings" ON public.profile_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update their own settings" ON public.profile_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id),
  UNIQUE (sender_id, receiver_id)
);
GRANT SELECT, INSERT ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own contact requests" ON public.contact_requests FOR SELECT TO authenticated USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users send permitted contact requests" ON public.contact_requests FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage blocks they created" ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "Users can block others" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users can remove their own blocks" ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE FUNCTION public.topone_are_contacts(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contact_requests r
    WHERE r.status = 'accepted'
      AND ((r.sender_id = _user_a AND r.receiver_id = _user_b)
        OR (r.sender_id = _user_b AND r.receiver_id = _user_a))
  );
$$;
REVOKE ALL ON FUNCTION public.topone_are_contacts(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topone_are_contacts(uuid, uuid) TO authenticated;

CREATE FUNCTION public.topone_can_message(_sender uuid, _recipient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _sender = auth.uid()
    AND _recipient IS NOT NULL
    AND _sender <> _recipient
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = _sender AND b.blocked_id = _recipient)
         OR (b.blocker_id = _recipient AND b.blocked_id = _sender)
    )
    AND EXISTS (
      SELECT 1
      FROM public.profile_settings s
      WHERE s.user_id = _recipient
        AND (s.message_privacy = 'everyone' OR public.topone_are_contacts(_sender, _recipient))
    );
$$;
REVOKE ALL ON FUNCTION public.topone_can_message(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topone_can_message(uuid, uuid) TO authenticated;

CREATE FUNCTION public.topone_can_request_contact(_sender uuid, _recipient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _sender = auth.uid()
    AND _recipient IS NOT NULL
    AND _sender <> _recipient
    AND EXISTS (
      SELECT 1 FROM public.profile_settings s
      WHERE s.user_id = _recipient AND s.allow_contact_requests
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = _sender AND b.blocked_id = _recipient)
         OR (b.blocker_id = _recipient AND b.blocked_id = _sender)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.contact_requests r
      WHERE (r.sender_id = _sender AND r.receiver_id = _recipient)
         OR (r.sender_id = _recipient AND r.receiver_id = _sender)
    );
$$;
REVOKE ALL ON FUNCTION public.topone_can_request_contact(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topone_can_request_contact(uuid, uuid) TO authenticated;
DROP POLICY "Users send permitted contact requests" ON public.contact_requests;
CREATE POLICY "Users send permitted contact requests" ON public.contact_requests FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.topone_can_request_contact(sender_id, receiver_id));

CREATE FUNCTION public.topone_respond_contact_request(_request_id uuid, _status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_count integer;
BEGIN
  IF auth.uid() IS NULL OR _status NOT IN ('accepted', 'declined') THEN
    RETURN false;
  END IF;
  UPDATE public.contact_requests
     SET status = _status, updated_at = now()
   WHERE id = _request_id AND receiver_id = auth.uid() AND status = 'pending';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.topone_respond_contact_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topone_respond_contact_request(uuid, text) TO authenticated;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  CHECK (created_by = user_a OR created_by = user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversation members can read conversations" ON public.conversations FOR SELECT TO authenticated USING (user_a = auth.uid() OR user_b = auth.uid());
CREATE POLICY "Users start conversations allowed by privacy" ON public.conversations FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
  AND (user_a = auth.uid() OR user_b = auth.uid())
  AND public.topone_can_message(auth.uid(), CASE WHEN user_a = auth.uid() THEN user_b ELSE user_a END)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX messages_conversation_created_idx ON public.messages (conversation_id, created_at DESC);
CREATE POLICY "Conversation members can read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
);
CREATE POLICY "Members send messages when privacy allows" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
      AND public.topone_can_message(auth.uid(), CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END)
  )
);
CREATE POLICY "Recipients mark messages read" ON public.messages FOR UPDATE TO authenticated USING (
  sender_id <> auth.uid()
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
) WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
);

CREATE FUNCTION public.topone_create_account_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username text;
BEGIN
  new_username := 'U' || upper(substr(replace(NEW.id::text, '-', ''), 1, 12));
  INSERT INTO public.profiles (user_id, username, display_name, country_code)
  VALUES (NEW.id, new_username, COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''), 'TOPONE'), 'EG');
  INSERT INTO public.profile_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS topone_create_account_data ON auth.users;
CREATE TRIGGER topone_create_account_data
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.topone_create_account_data();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;