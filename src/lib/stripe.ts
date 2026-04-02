import Stripe from 'stripe'

// Cliente de Stripe — solo se usa en el servidor
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

// Planes y sus precios
export const PLANES = {
  basic: {
    nombre: 'Básico',
    precio: 19,
    priceId: process.env.STRIPE_PRICE_BASIC!,
    descripcion:
      '2 staff, reservas online con link, email, recordatorios 24h y 2h, agenda básica, política de cancelación',
    limites: { barberos: 2, servicios: 10 },
  },
  pro: {
    nombre: 'Pro',
    precio: 39,
    priceId: process.env.STRIPE_PRICE_PRO!,
    descripcion:
      'Staff ilimitado, dashboard avanzado, lista negra no-shows, alertas clientes inactivos, historial por cliente, página de reservas con marca',
    limites: { barberos: 999, servicios: 999 },
  },
  /** Contratos a medida; contacto comercial. Si usas Stripe para un cliente premium, define STRIPE_PRICE_PREMIUM. */
  premium: {
    nombre: 'Premium',
    precio: 0,
    priceId: process.env.STRIPE_PRICE_PREMIUM ?? '',
    descripcion: 'Servicio personalizado — consultar disponibilidad y precio',
    limites: { barberos: 999, servicios: 999 },
  },
} as const

export type PlanKey = keyof typeof PLANES

// Crear o recuperar customer de Stripe para un negocio
export async function getOrCreateStripeCustomer(negocioId: string, email: string, nombre: string) {
  // Buscar si ya existe
  const customers = await stripe.customers.list({ email, limit: 1 })
  if (customers.data.length > 0) return customers.data[0]

  // Crear nuevo
  return stripe.customers.create({
    email,
    name: nombre,
    metadata: { negocio_id: negocioId },
  })
}

// Crear sesión de checkout para suscripción
export async function crearCheckoutSession(
  customerId: string,
  priceId: string,
  negocioId: string,
  successUrl: string,
  cancelUrl: string
) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { negocio_id: negocioId },
    subscription_data: {
      trial_period_days: 0,
      metadata: { negocio_id: negocioId },
    },
  })
}

// Crear portal de facturación (el cliente gestiona su suscripción)
export async function crearPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
