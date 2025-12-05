// supabase/functions/admin_generate_report/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    // simple example: return last 100 payments and messages
    const { data: payments, error: paymentsError } = await supabase
      .from('stripe_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (paymentsError) throw paymentsError;

    const { data: messages, error: messagesError } = await supabase
      .from('generated_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (messagesError) throw messagesError;

    return new Response(JSON.stringify({ payments, messages }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
