// Supabase Edge Function: dagbok-notify
// Utlöses av en Database Webhook när en rad läggs till (eller uppdateras) i
// tabellen "dagbok". Skickar en push-notis till alla som "bevakar" den hästen
// (tabellen diary_watchers), utom författaren själv.
//
// Deploy: Verify JWT = AV (webhooken anropar utan användartoken).
// Secrets som måste finnas: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// (SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY finns automatiskt.)

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@hoglanda.se'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    // Database Webhook skickar { type, table, record, old_record, ... }
    const row = payload.record ?? payload
    const horse: string | undefined = row?.horse
    const authorId: string | undefined = row?.user_id
    const authorName: string = row?.name || 'Någon'
    if (!horse) return json({ skipped: 'ingen häst' })

    // Vilka bevakar den här hästen?
    const { data: watchers } = await supabase
      .from('diary_watchers')
      .select('user_id')
      .eq('horse', horse)
    if (!watchers || watchers.length === 0) return json({ skipped: 'inga bevakare' })

    // Inte notisen till den som själv skrev anteckningen.
    const userIds = [...new Set(watchers.map((w) => w.user_id))].filter((id) => id !== authorId)
    if (userIds.length === 0) return json({ skipped: 'bara författaren' })

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', userIds)
    if (!subs || subs.length === 0) return json({ skipped: 'inga prenumerationer' })

    const notif = JSON.stringify({
      title: 'Ny dagboksanteckning 🐴',
      body: `${authorName} skrev om ${horse}`,
      url: '/',
      tag: 'dagbok-' + horse,
    })

    let sent = 0
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notif,
        )
        sent++
      } catch (e: any) {
        // 404/410 = prenumerationen finns inte längre -> städa bort
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
      }
    }))
    return json({ ok: true, sent })
  } catch (e: any) {
    // Svara 200 så webhooken inte försöker om och om igen.
    return json({ error: String(e?.message ?? e) })
  }
})

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' }, status: 200 })
}
