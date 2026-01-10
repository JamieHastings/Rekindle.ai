/*
  # Create convert_preview_on_signup RPC Function

  This function converts preview messages to full messages when a user signs up.
  It finds all preview messages associated with a session_id and converts them
  to full messages in the generated_messages table.

  ## Function
  - `convert_preview_on_signup(p_user_id uuid, p_session_id text)`
    - Finds all preview_messages with matching session_id
    - Creates corresponding entries in generated_messages
    - Marks them as is_preview: true
    - Returns the count of converted messages
*/

CREATE OR REPLACE FUNCTION convert_preview_on_signup(
  p_user_id uuid,
  p_session_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  preview_record RECORD;
BEGIN
  -- Loop through all preview messages for this session
  FOR preview_record IN
    SELECT *
    FROM preview_messages
    WHERE session_id = p_session_id
      AND user_id IS NULL
      AND unlocked_by_user_id IS NULL
  LOOP
    -- Build input_data from preview form_data if available, otherwise reconstruct
    DECLARE
      v_input_data jsonb;
    BEGIN
      v_input_data := COALESCE(
        preview_record.form_data,
        jsonb_build_object(
          'name', preview_record.recipient_name,
          'relationshipLength', preview_record.relationship_length,
          'tone', preview_record.tone,
          'messageType', preview_record.message_type,
          'occasion', preview_record.occasion,
          'additionalDetails', preview_record.additional_details,
          'characterLength', preview_record.character_length
        )
      );
    END;

    -- Insert into generated_messages
    INSERT INTO generated_messages (
      user_id,
      message_type,
      tone,
      recipient_name,
      relationship_length,
      occasion,
      additional_details,
      character_length,
      generated_content,
      input_data,
      is_preview
    )
    VALUES (
      p_user_id,
      preview_record.message_type,
      preview_record.tone,
      preview_record.recipient_name,
      preview_record.relationship_length,
      preview_record.occasion,
      preview_record.additional_details,
      preview_record.character_length,
      preview_record.full_content,
      v_input_data,
      true -- Mark as preview conversion
    );

    -- Mark preview as unlocked by this user
    UPDATE preview_messages
    SET unlocked_by_user_id = p_user_id
    WHERE id = preview_record.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error converting previews for user %: %', p_user_id, SQLERRM;
    RETURN v_count;
END;
$$;

