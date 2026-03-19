import { createClient } from '@supabase/supabase-js'
import type { Database } from './types/database.types'

interface SupabaseConfig {
  url: string
  anonKey: string
  options?: {
    auth?: {
      autoRefreshToken?: boolean
      persistSession?: boolean
      detectSessionInUrl?: boolean
    }
    global?: {
      headers?: Record<string, string>
    }
  }
}

type SupabaseClient = ReturnType<typeof createClient<Database>>

const DEFAULT_OPTIONS = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}

let clientInstance: SupabaseClient | null = null
let initializationPromise: Promise<SupabaseClient> | null = null

/**
 * Retorna uma instância singleton do cliente Supabase
 * @returns {Promise<SupabaseClient>} Instância configurada do cliente Supabase
 * @throws {Error} Se as variáveis de ambiente não estiverem configuradas
 */
async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientInstance) {
    return clientInstance
  }

  if (!initializationPromise) {
    initializationPromise = initializeClient()
  }

  return initializationPromise
}

async function initializeClient(): Promise<SupabaseClient> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !url.startsWith('https://')) {
    throw new Error('URL do Supabase inválida ou não configurada. Configure VITE_SUPABASE_URL no ambiente.')
  }

  if (!anonKey || typeof anonKey !== 'string') {
    throw new Error('Anon Key do Supabase inválida ou não configurada. Configure VITE_SUPABASE_ANON_KEY no ambiente.')
  }

  const config: SupabaseConfig = {
    url,
    anonKey,
    options: DEFAULT_OPTIONS
  }

  clientInstance = createClient<Database>(config.url, config.anonKey, config.options)
  return clientInstance
}

export { getSupabaseClient }
export type { SupabaseClient }