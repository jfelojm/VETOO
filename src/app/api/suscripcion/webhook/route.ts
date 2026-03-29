import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
})

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabase()

  const PRICE_TO_PLAN: Record<string, string> = {
    [process.env.STRIPE_PRICE_BASIC  ?? '']: 'basic',
    [process.env.STRIPE_PRICE_PRO    ?? '']: 'pro',
    [process.env.STRIPE_PRICE_PREMIUM ?? '']: 'premium',
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const negocioId = subscription.metadata.negocio_id
      const priceId = subscription.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId] ?? 'basic'
      await supabase.from('negocios').update({
        plan,
        stripe_subscription_id: subscriptionId,
        plan_expira_at: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('id', negocioId)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const negocioId = subscription.metadata.negocio_id
      await supabase.from('negocios').update({ plan: 'cancelled' }).eq('id', negocioId)
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const negocioId = subscription.metadata.negocio_id
      const priceId = subscription.items.data[0].price.id
      const plan = PRICE_TO_PLAN[priceId] ?? 'basic'
      await supabase.from('negocios').update({
        plan,
        plan_expira_at: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq('id', negocioId)
      break
    }
  }

  return NextResponse.json({ received: true })
}