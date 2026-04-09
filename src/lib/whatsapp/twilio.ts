import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER!}`

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  await client.messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body,
  })
}
