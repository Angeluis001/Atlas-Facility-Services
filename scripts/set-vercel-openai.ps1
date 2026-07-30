# Configura OPENAI_API_KEY en Vercel (requiere sesión CLI válida).
# Uso:
#   1) vercel login
#   2) powershell -ExecutionPolicy Bypass -File scripts/set-vercel-openai.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$key = $env:OPENAI_API_KEY
if (-not $key) {
  $envFile = Get-Content .env.local -Raw -ErrorAction SilentlyContinue
  if ($envFile -match 'OPENAI_API_KEY=([^\r\n]+)') {
    $key = $matches[1].Trim()
  }
}
if (-not $key) {
  Write-Error "Define OPENAI_API_KEY o colócala en .env.local"
}

Write-Host "Añadiendo OPENAI_API_KEY a Production / Preview / Development..."
vercel env add OPENAI_API_KEY production --value $key --yes --force --sensitive
vercel env add OPENAI_API_KEY development --value $key --yes --force
vercel env add OPENAI_MODEL production --value "gpt-4o-mini" --yes --force
vercel env add OPENAI_MODEL development --value "gpt-4o-mini" --yes --force
Write-Host "Listo. Ejecuta: vercel --prod --yes"
