import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

// Types
interface WebhookEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: {
      id: string;
      customer?: string;
      email?: string;
      status?: string;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
      metadata?: {
        user_id?: string;
        [key: string]: string;
      };
    };
  };
}

interface SubscriptionUpdate {
  user_id: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  subscription_id: string;
}

interface WebhookResult {
  success: boolean;
  message: string;
  processed_event?: string;
  error?: string;
}

interface PaddleWebhook {
  alert_id: string;
  alert_name: string;
  status?: string;
  cancel_url?: string;
  checkout_id?: string;
  currency?: string;
  email?: string;
  event_time: string;
  linked_subscriptions?: string;
  marketing_consent?: string;
  next_bill_date?: string;
  passthrough?: string;
  quantity?: string;
  source?: string;
  subscription_id?: string;
  subscription_plan_id?: string;
  unit_price?: string;
  update_url?: string;
  user_id?: string;
  p_signature: string;
}

// Environment variables validation
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const PADDLE_WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET') || '';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout for external calls

// Validate required environment variables
function validateEnvironment(): void {
  const requiredVars = [
    { name: 'SUPABASE_URL', value: SUPABASE_URL },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_ROLE_KEY },
    { name: 'STRIPE_WEBHOOK_SECRET', value: STRIPE_WEBHOOK_SECRET },
    { name: 'PADDLE_WEBHOOK_SECRET', value: PADDLE_WEBHOOK_SECRET }
  ];

  const missingVars = requiredVars.filter(v => !v.value);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.map(v => v.name).join(', ')}`);
  }

  // Validate URL format
  try {
    new URL(SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }
}

// Supported events
const SUPPORTED_EVENTS = {
  STRIPE: [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ],
  PADDLE: [
    'subscription.created',
    'subscription.updated',
    'subscription.cancelled',
    'payment.succeeded',
    'payment.failed'
  ]
};

// Status mapping
const STATUS_MAPPING = {
  stripe: {
    'active': 'active',
    'canceled': 'canceled',
    'past_due': 'past_due',
    'trialing': 'trialing',
    'incomplete': 'incomplete'
  },
  paddle: {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'paused': 'canceled',
    'deleted': 'canceled'
  }
};

// Rate limiting using Supabase (serverless compatible) with performance optimization
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60000; // Cleanup every minute

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; message: string }> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Clean up old entries only once per minute to reduce DB operations
    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
      const oneMinuteAgo = new Date(now - 60000).toISOString();
      await supabase
        .from('rate_limits')
        .delete()
        .lt('created_at', oneMinuteAgo)
        .catch(err => console.error('Cleanup error (non-critical):', err.message));
      lastCleanup = now;
    }

    // Get current count
    const oneMinuteAgo = new Date(now - 60000).toISOString();
    const { data: existingRecords, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('created_at', oneMinuteAgo);

    if (fetchError) throw fetchError;

    const currentCount = existingRecords?.length || 0;
    
    if (currentCount >= 100) {
      return { allowed: false, message: 'Rate limit exceeded' };
    }

    // Insert new rate limit record
    const { error: insertError } = await supabase
      .from('rate_limits')
      .insert([{ ip_address: ip, created_at: new Date().toISOString() }]);

    if (insertError) throw insertError;

    return { allowed: true, message: 'OK' };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow request on rate limit failure to avoid blocking legitimate traffic
    return { allowed: true, message: 'Rate limit check failed, proceeding anyway' };
  }
}

// Verify Stripe webhook signature
async function verifyStripeSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(STRIPE_WEBHOOK_SECRET);
    
    // Stripe signs with HMAC-SHA256
    const hmac = createHmac('sha256', secretKey);
    hmac.update(encoder.encode(payload));
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison
    const signatureBuffer = encoder.encode(signature);
    const expectedBuffer = encoder.encode(`sha256=${expectedSignature}`);
    
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Stripe signature verification error:', error);
    return false;
  }
}

// Verify Paddle webhook signature
async function verifyPaddleSignature(
  payload: Record<string, unknown>,
  signature: string
): Promise<boolean> {
  try {
    // Paddle requires specific signature verification
    // Remove p_signature from payload for verification
    const { p_signature, ...dataToVerify } = payload as Record<string, string>;
    
    // Sort keys alphabetically
    const sortedKeys = Object.keys(dataToVerify).sort();
    
    // Create concatenated string
    const concatenated = sortedKeys
      .map(key => `${key}=${dataToVerify[key]}`)
      .join('&');
    
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(PADDLE_WEBHOOK_SECRET);
    
    // Paddle uses SHA1 HMAC
    const hmac = createHmac('sha1', secretKey);
    hmac.update(encoder.encode(concatenated));
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison
    const signatureBuffer = encoder.encode(signature);
    const expectedBuffer = encoder.encode(expectedSignature);
    
    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Paddle signature verification error:', error);
    return false;
  }
}

// Process Stripe webhook
async function processStripeWebhook(
  event: WebhookEvent,
  supabase: ReturnType<typeof createClient>
): Promise<WebhookResult> {
  try {
    const { type, data } = event;
    
    if (!SUPPORTED_EVENTS.STRIPE.includes(type)) {
      return {
        success: false,
        message: `Unsupported event type: ${type}`
      };
    }

    const subscription = data.object;
    const userId = subscription.metadata?.user_id;
    
    if (!userId) {
      return {
        success: false,
        message: 'No user_id found in subscription metadata'
      };
    }

    // Map Stripe status to our internal status
    const stripeStatus = subscription.status || 'incomplete';
    const mappedStatus = STATUS_MAPPING.stripe[stripeStatus as keyof typeof STATUS_MAPPING.stripe] || 'incomplete';

    const updateData: SubscriptionUpdate = {
      user_id: userId,
      subscription_status: mappedStatus as SubscriptionUpdate['subscription_status'],
      current_period_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      subscription_id: subscription.id
    };

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: updateData.subscription_status,
        current_period_end: updateData.current_period_end?.toISOString(),
        cancel_at_period_end: updateData.cancel_at_period_end,
        subscription_id: updateData.subscription_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', updateData.user_id);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return {
      success: true,
      message: `Processed Stripe event: ${type}`,
      processed_event: type
    };
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return {
      success: false,
      message: 'Failed to process Stripe webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Process Paddle webhook
async function processPaddleWebhook(
  event: PaddleWebhook,
  supabase: ReturnType<typeof createClient>
): Promise<WebhookResult> {
  try {
    const { alert_name, status, subscription_id, passthrough, next_bill_date } = event;
    
    if (!SUPPORTED_EVENTS.PADDLE.includes(alert_name)) {
      return {
        success: false,
        message: `Unsupported event type: ${alert_name}`
      };
    }

    // Extract user_id from passthrough or use provided user_id
    let userId = '';
    if (passthrough) {
      try {
        const parsed = JSON.parse(passthrough);
        userId = parsed.user_id || '';
      } catch {
        // If passthrough is not JSON, try to use it directly
        userId = passthrough;
      }
    }
    
    if (!userId && event.user_id) {
      userId = event.user_id;
    }

    if (!userId) {
      return {
        success: false,
        message: 'No user_id found in webhook data'
      };
    }

    // Map Paddle status to our internal status
    const paddleStatus = status || 'inactive';
    const mappedStatus = STATUS_MAPPING.paddle[paddleStatus as keyof typeof STATUS_MAPPING.paddle] || 'inactive';

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: mappedStatus,
        current_period_end: next_bill_date ? new Date(next_bill_date).toISOString() : null,
        subscription_id: subscription_id || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return {
      success: true,
      message: `Processed Paddle event: ${alert_name}`,
      processed_event: alert_name
    };
  } catch (error) {
    console.error('Paddle webhook processing error:', error);
    return {
      success: false,
      message: 'Failed to process Paddle webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Main request handler
serve(async (req) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers, status: 405 }
    );
  }

  try {
    // Validate environment
    validateEnvironment();

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimit.message }),
        { headers, status: 429 }
      );
    }

    // Parse request body
    const body = await req.text();
    const contentType = req.headers.get('content-type') || '';
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check webhook source based on headers or content
    const stripeSignature = req.headers.get('stripe-signature');
    const isPaddle = contentType.includes('application/x-www-form-urlencoded');

    let result: WebhookResult;

    if (stripeSignature) {
      // Verify Stripe signature
      const isValid = await verifyStripeSignature(body, stripeSignature);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid Stripe signature' }),
          { headers, status: 401 }
        );
      }

      // Parse Stripe event
      const event: WebhookEvent = JSON.parse(body);
      result = await processStripeWebhook(event, supabase);
      
    } else if (isPaddle) {
      // Parse Paddle webhook (form-urlencoded)
      const params = new URLSearchParams(body);
      const paddleEvent: Record<string, string> = {};
      
      for (const [key, value] of params.entries()) {
        paddleEvent[key] = value;
      }

      // Verify Paddle signature
      const signature = paddleEvent.p_signature;
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Missing Paddle signature' }),
          { headers, status: 401 }
        );
      }

      const isValid = await verifyPaddleSignature(paddleEvent, signature);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid Paddle signature' }),
          { headers, status: 401 }
        );
      }

      // Type assertion for Paddle webhook
      const typedEvent = paddleEvent as unknown as PaddleWebhook;
      result = await processPaddleWebhook(typedEvent, supabase);
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported webhook source' }),
        { headers, status: 400 }
      );
    }

    // Return appropriate response
    const status = result.success ? 200 : 400;
    return new Response(
      JSON.stringify(result),
      { headers, status }
    );

  } catch (error) {
    console.error('Webhook handler error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        },
        status: 500
      }
    );
  }
});