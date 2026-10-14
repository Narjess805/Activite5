$ErrorActionPreference = "Stop"

param(
    [string]$BaseUrl = "http://localhost"
)

$forwardUrl = "$($BaseUrl.TrimEnd('/'))/api/courses/payments/stripe/webhook"

if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
    Write-Error "Stripe CLI is not installed or not on PATH. Install it first, then run this script again."
    exit 1
}

Write-Host "Forwarding Stripe webhooks to $forwardUrl"
Write-Host "Copy the printed whsec_... secret into .env as STRIPE_WEBHOOK_SECRET, then restart course-service."
Write-Host "Note: Stripe Dashboard event destinations reject localhost URLs, so use Stripe CLI for local development."

stripe listen --forward-to $forwardUrl
