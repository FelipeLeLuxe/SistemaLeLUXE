import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wzpxeawxjavjcqozujws.supabase.co'
const supabaseKey = 'sb_publishable_3TMKoLzddv5W9omSUNnYOw_9NOhe-GO'

export const supabase = createClient(supabaseUrl, supabaseKey)