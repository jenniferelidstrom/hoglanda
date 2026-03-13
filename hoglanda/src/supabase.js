import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vzuocuhthbuyeiwtjmvg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dW9jdWh0aGJ1eWVpd3RqbXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODM1OTUsImV4cCI6MjA4ODg1OTU5NX0.qv0aMohFI2K6JwFtrK91Yf_UryHFXR2xeSMIBe4d81o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
