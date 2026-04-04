import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  procesarNotificacionPayPhone,
  type PayPhoneNotificacionBody,
} from '@/lib/payphone-webhook'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
})

function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada')
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

function buildPriceToPlan(): Record<string, string> {
  const m: Record<string, string> = {}
  if (process.env.STRIPE_PRICE_BASIC) m[process.env.STRIPE_PRICE_BASIC] = 'basic'
  if (process.env.STRIPE_PRICE_PRO) m[process.env.STRIPE_PRICE_PRO] = 'pro'
  if (process.env.STRIPE_PRICE_PREMIUM) m[process.env.STRIPE_PRICE_PREMIUM] = 'premium'
  return m
}

async function aplicarPlanDesdeSuscripcion(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  subscription: Stripe.Subscription
) {
  const negocioId = subscription.metadata?.negocio_id
  if (!negocioId) return

  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return

  const plan = buildPriceToPlan()[priceId] ?? 'basic'

  await supabase
    .from('negocios')
    .update({
      plan,
      stripe_subscription_id: subscription.id,
      plan_expira_at: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', negocioId)
}

/**
 * Stripe webhooks (firma `stripe-signature`) o notificación PayPhone (JSON con TransactionId).
 * PayPhone Notificación Externa con path `/webhook/NotificacionPago` está en ese route.
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let supabase: ReturnType<typeof getSupabaseAdmin>
    try {
      supabase = getSupabaseAdmin()
    } catch {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subId = session.subscription
        if (typeof subId !== 'string') break
        const subscription = await stripe.subscriptions.retrieve(subId)
        await aplicarPlanDesdeSuscripcion(supabase, subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription
        if (typeof subscriptionId !== 'string') break
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await aplicarPlanDesdeSuscripcion(supabase, subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const negocioId = subscription.metadata?.negocio_id
        if (negocioId) {
          await supabase.from('negocios').update({ plan: 'cancelled' }).eq('id', negocioId)
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await aplicarPlanDesdeSuscripcion(supabase, subscription)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  }

  try {
    const json = JSON.parse(body) as PayPhoneNotificacionBody
    if (json.TransactionId != null && json.ClientTransactionId != null) {
      return procesarNotificacionPayPhone(json)
    }
  } catch {
    /* no es JSON PayPhone */
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 })
}
