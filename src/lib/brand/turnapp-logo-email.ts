/**
 * Marcas SVG inline para emails (mismos paths que TurnAppLogo).
 */

const SYM_LIGHT = '#0D9B6A'
const TURN_LIGHT = '#0A0A0F'
const APP_LIGHT = '#0D9B6A'

/** Símbolo (arco + flecha + dot) */
export function turnappEmailSymbolSvg(size: number, symColor = SYM_LIGHT): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 56 56" fill="none" aria-hidden="true">
  <g transform="rotate(-90 28 28)">
    <circle cx="28" cy="28" r="22" stroke="${symColor}" stroke-width="2.5" stroke-dasharray="110 28" stroke-linecap="round" fill="none"/>
  </g>
  <polygon points="44.2,12.8 38.2,9.8 38.2,16.2" fill="${symColor}"/>
  <circle cx="28" cy="28" r="5" fill="${symColor}"/>
</svg>`.trim()
}

/** Header de email: símbolo + wordmark Outfit 800 */
export function turnappEmailHeaderLogoHtml(): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
  <tr>
    <td style="vertical-align:middle;padding-right:10px;">${turnappEmailSymbolSvg(40)}</td>
    <td style="vertical-align:middle;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-1.2px;line-height:1;">
      <span style="color:${TURN_LIGHT};">Turn</span><span style="color:${APP_LIGHT};">App</span>
    </td>
  </tr>
</table>`.trim()
}

/** Footer de email: logo compacto */
export function turnappEmailFooterLogoHtml(symSize = 28): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px;">
  <tr>
    <td style="vertical-align:middle;padding-right:8px;">${turnappEmailSymbolSvg(symSize)}</td>
    <td style="vertical-align:middle;font-family:'Outfit',Helvetica,Arial,sans-serif;font-size:16px;font-weight:800;letter-spacing:-1.2px;">
      <span style="color:${TURN_LIGHT};">Turn</span><span style="color:${APP_LIGHT};">App</span>
    </td>
  </tr>
</table>`.trim()
}
