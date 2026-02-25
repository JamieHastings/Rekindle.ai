-- Allow anonymous preview messages in generated_messages (user_id null, link on signup)

-- Allow user_id to be null for anonymous messages
ALTER TABLE generated_messages
  ALTER COLUMN user_id DROP NOT NULL;

-- Allow anonymous users to insert rows with user_id null (preview messages)
CREATE POLICY "Allow anonymous message insert"
  ON generated_messages FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Allow service role / authenticated to update anonymous messages (for linking on signup)
-- Existing "Users can update own messages" uses auth.uid() = user_id, so won't match null.
-- Linking is done server-side (e.g. edge function or trigger) or we need a policy that
-- allows update when row has user_id null. For client-side link we need:
-- "Allow update to set user_id when current user_id is null" - so authenticated users
-- can update rows that have user_id null (to claim them). That's a bit unusual for RLS.
-- Safer: do linking in an edge function with service role. For now we'll rely on
-- the client calling as the new user - but then the row has user_id null so
-- auth.uid() = user_id is false. So the update must happen via service role or we
-- need: WITH CHECK (user_id IS NULL) for UPDATE... then WITH CHECK (true) to allow
-- setting user_id. Actually the simplest is to let the signup flow call an edge
-- function that uses service role to do the link. The user said to do it in
-- AuthContext - so the client will call supabase.from().update() as the newly
-- signed-in user. For that to work we need a policy that allows updating rows
-- where user_id is null, and set user_id to auth.uid(). So:
-- UPDATE policy: USING (user_id IS NULL) WITH CHECK (user_id = auth.uid())
-- So "you can update a row that has no user if you set user_id to yourself"
CREATE POLICY "Allow claim anonymous messages on signup"
  ON generated_messages FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
