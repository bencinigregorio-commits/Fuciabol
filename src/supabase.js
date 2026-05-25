import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jiabtjhvvouehxpikaph.supabase.co'
const supabaseKey = 'sb_publishable_V_iTOv_jkCf-bZrCVLTk_A_v72SBLz4'

export const supabase = createClient(supabaseUrl, supabaseKey)
