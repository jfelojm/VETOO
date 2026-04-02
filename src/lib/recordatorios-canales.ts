/**
 * Canal opcional para recordatorios por WhatsApp / SMS.
 * Configura NOTIFICACIONES_WHATSAPP_WEBHOOK_URL (POST JSON: { telefono, mensaje }).
 */
export async function enviarRecordatorioWhatsappWebhook(
  telefonoRaw: string,
  mensaje: string
): Promise<boolean> {
  const url = process.env.NOTIFICACIONES_WHATSAPP_WEBHOOK_URL
  if (!url?.trim()) return false
  const telefono = telefonoRaw.replace(/\D/g, '')
  if (telefono.length < 7) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, mensaje }),
    })
    return res.ok
  } catch {
    return false
  }
}
