import { createServiceClient } from '@/lib/supabase/server'

interface ErrorLogEntry {
  profile_id?: string | null
  stage?: number | null
  error_message: string
  error_code?: string | null
  query_context?: Record<string, unknown>
  source?: string | null
}

export async function logError(entry: ErrorLogEntry): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from('error_log').insert({
      profile_id: entry.profile_id ?? null,
      stage: entry.stage ?? null,
      error_message: entry.error_message,
      error_code: entry.error_code ?? null,
      query_context: entry.query_context ?? {},
      source: entry.source ?? null,
    })
  } catch {
    // Never let error logging itself crash the handler
  }
}
