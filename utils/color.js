// "  noir  " / "NOIR" -> "Noir" : évite les doublons Noir / noir
export const normColor = (s) => {
  const t = String(s).trim().replace(/\s+/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}
