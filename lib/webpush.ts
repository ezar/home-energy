import webpush from 'web-push'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = `mailto:${process.env.VAPID_EMAIL ?? 'admin@example.com'}`

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export const vapidPublicKey = VAPID_PUBLIC

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string }
): Promise<void> {
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}
