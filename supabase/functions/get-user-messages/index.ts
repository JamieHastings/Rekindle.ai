import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface GetMessagesRequest {
  limit?: number;
  offset?: number;
  messageType?: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const requestData: GetMessagesRequest = await req.json().catch(() => ({}));
    const limit = requestData.limit || 50;
    const offset = requestData.offset || 0;

    // Build query using admin client
    let query = supabaseAdmin
      .from("generated_messages")
      .select("id, message_type, tone, recipient_name, created_at, generated_content, is_favorite")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by message type if provided
    if (requestData.messageType) {
      query = query.eq("message_type", requestData.messageType);
    }

    const { data: messages, error: queryError } = await query;

    if (queryError) {
      console.error("Error fetching messages:", queryError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format messages with preview (first 2-3 lines)
    const formattedMessages = (messages || []).map((msg) => ({
      id: msg.id,
      type: msg.message_type,
      tone: msg.tone,
      recipient_name: msg.recipient_name,
      created_at: msg.created_at,
      preview: msg.generated_content ? msg.generated_content.substring(0, 200).trim() + "..." : "",
      full_content: msg.generated_content, // Include full content for dashboard
      is_favorite: msg.is_favorite,
    }));

    return new Response(
      JSON.stringify({
        messages: formattedMessages,
        count: formattedMessages.length,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-user-messages function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

