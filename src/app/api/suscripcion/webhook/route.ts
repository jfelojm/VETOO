import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Desactivar el body parser de Next.js para poder leer el raw body
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature inválida:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {

    // Suscripción creada o renovada exitosamente
    case 'invoice.payment_succeeded': {
      const invoice      = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const negocioId    = subscription.metadata.negocio_id
      const priceId      = subscription.items.data[0].price.id

      // Determinar el plan por el priceId
      const PRICE_TO_PLAN: Record<string, string> = {
        [process.env.STRIPE_PRICE_BASIC!]:   'basic',
        [process.env.STRIPE_PRICE_PRO!]:     'pro',
        [process.env.STRIPE_PRICE_PREMIUM!]: 'premium',
      }
      const plan = PRICE_TO_PLAN[priceId] ?? 'basic'

      await supabase
        .from('negocios')
        .update({
          plan,
          stripe_subscription_id: subscriptionId,
          plan_expira_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', negocioId)

      console.log(`Plan activado: ${plan} para negocio ${negocioId}`)
      break
    }

    // Pago fallido
    case 'invoice.payment_failed': {
      const invoice      = event.data.object as Stripe.Invoice
      const subscriptionId = invoice.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const negocioId    = subscription.metadata.negocio_id

      // No cancelamos inmediatamente, Stripe reintenta. Solo logueamos.
      console.warn(`Pago fallido para negocio ${negocioId}`)
      break
    }

    // Suscripción cancelada
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const negocioId    = subscription.metadata.negocio_id

      await supabase
        .from('negocios')
        .update({ plan: 'cancelled' })
        .eq('id', negocioId)

      console.log(`Suscripción cancelada para negocio ${negocioId}`)
      break
    }

    // Suscripción actualizada (cambio de plan)
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const negocioId    = subscription.metadata.negocio_id
      const priceId      = subscription.items.data[0].price.id

      const PRICE_TO_PLAN: Record<string, string> = {
        [process.env.STRIPE_PRICE_BASIC!]:   'basic',
        [process.env.STRIPE_PRICE_PRO!]:     'pro',
        [process.env.STRIPE_PRICE_PREMIUM!]: 'premium',
      }
      const plan = PRICE_TO_PLAN[priceId] ?? 'basic'

      await supabase
        .from('negocios')
        .update({
          plan,
          plan_expira_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', negocioId)

      console.log(`Plan actualizado a ${plan} para negocio ${negocioId}`)
      break
    }
  }

  return NextResponse.json({ received: true })
}
