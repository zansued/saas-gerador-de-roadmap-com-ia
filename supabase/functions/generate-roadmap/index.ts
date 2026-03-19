import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0] || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const RequestSchema = z.object({
  topic: z.string().min(3).max(100),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),
  time_commitment: z.number().min(1).max(40),
  user_id: z.string().uuid().optional(),
});

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  resources: Array<{
    title: string;
    url: string;
    type: 'video' | 'article' | 'course' | 'project';
  }>;
  order: number;
  prerequisites?: string[];
}

interface GeneratedRoadmap {
  id: string;
  topic: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  time_commitment: number;
  steps: RoadmapStep[];
  estimated_completion: string;
  created_at: string;
}

interface RequestParams {
  topic: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  time_commitment: number;
  user_id?: string;
}

const sanitizeTopic = (topic: string): string => {
  return topic
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
};

const checkRateLimit = async (userId: string | undefined, supabase: any): Promise<boolean> => {
  if (!userId) return false;
  const RATE_LIMIT = parseInt(Deno.env.get('RATE_LIMIT') || '5');
  const now = Math.floor(Date.now() / 1000);
  const minuteAgo = now - 60;

  const { data, error } = await supabase
    .from('app_a3ade41d.rate_limits')
    .select('count')
    .eq('user_id', userId)
    .gte('timestamp', minuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  const totalRequests = data?.reduce((sum, item) => sum + item.count, 0) || 0;
  return totalRequests >= RATE_LIMIT;
};

const incrementRateLimit = async (userId: string | undefined, supabase: any) => {
  if (!userId) return;
  const now = Math.floor(Date.now() / 1000);

  await supabase
    .from('app_a3ade41d.rate_limits')
    .upsert({
      user_id: userId,
      timestamp: now,
      count: 1,
    }, { onConflict: 'user_id,timestamp', ignoreDuplicates: false });
};

const getFromCache = async (params: RequestParams, supabase: any): Promise<GeneratedRoadmap | null> => {
  const cacheKey = JSON.stringify(params);
  const { data, error } = await supabase
    .from('app_a3ade41d.roadmap_cache')
    .select('response, created_at')
    .eq('cache_key', cacheKey)
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .single();

  if (error || !data) return null;
  return data.response;
};

const cacheResponse = async (params: RequestParams, roadmap: GeneratedRoadmap, supabase: any) => {
  const cacheKey = JSON.stringify(params);
  await supabase
    .from('app_a3ade41d.roadmap_cache')
    .upsert({
      cache_key: cacheKey,
      response: roadmap,
      created_at: new Date().toISOString(),
    });
};

const generateWithAI = async (params: RequestParams): Promise<GeneratedRoadmap> => {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const sanitizedTopic = sanitizeTopic(params.topic);
  const totalWeeks = Math.ceil(100 / params.time_commitment);
  const estimatedCompletion = new Date(Date.now() + totalWeeks * 7 * 24 * 60 * 60 * 1000).toISOString();

  const prompt = `
Generate a learning roadmap for topic: "${sanitizedTopic}"
Skill level: ${params.skill_level}
Time commitment: ${params.time_commitment} hours per week

Please create a structured roadmap with 5-8 steps. Each step should have:
1. A clear title
2. Detailed description
3. Estimated hours to complete
4. 2-3 learning resources (with URLs if possible)
5. Prerequisites (if any)

Format the response as a JSON array of steps.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a learning roadmap generator. Always respond with valid JSON array of roadmap steps.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error('Failed to generate roadmap');
  }

  const data = await response.json();
  const aiContent = data.choices[0]?.message?.content || '[]';

  let steps: RoadmapStep[] = [];
  try {
    const parsedSteps = JSON.parse(aiContent);
    steps = parsedSteps.map((step: any, index: number) => ({
      id: crypto.randomUUID(),
      title: step.title || `Step ${index + 1}`,
      description: step.description || '',
      estimated_hours: step.estimated_hours || 0,
      resources: step.resources || [],
      order: index + 1,
      prerequisites: step.prerequisites || [],
    }));
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    throw new Error('Invalid roadmap data received');
  }

  const roadmap: GeneratedRoadmap = {
    id: crypto.randomUUID(),
    topic: sanitizedTopic,
    skill_level: params.skill_level,
    time_commitment: params.time_commitment,
    steps: steps,
    estimated_completion: estimatedCompletion,
    created_at: new Date().toISOString(),
  };

  return roadmap;
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders(origin),
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestData = await req.json();
    
    const validationResult = RequestSchema.safeParse(requestData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.format() }),
        {
          status: 400,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        }
      );
    }

    const params: RequestParams = validationResult.data;

    if (await checkRateLimit(params.user_id, supabase)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        }
      );
    }

    const cachedRoadmap = await getFromCache(params, supabase);
    if (cachedRoadmap) {
      await incrementRateLimit(params.user_id, supabase);
      return new Response(JSON.stringify(cachedRoadmap), {
        status: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const roadmap = await generateWithAI(params);
    await Promise.all([
      cacheResponse(params, roadmap, supabase),
      incrementRateLimit(params.user_id, supabase),
    ]);

    return new Response(JSON.stringify(roadmap), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = errorMessage.includes('OpenAI') || errorMessage.includes('Failed to generate') ? 502 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      }
    );
  }
});