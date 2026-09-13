# InternLink admin rubric smoke test
# Uses Node fetch instead of PowerShell Invoke-RestMethod to avoid serialization issues in this environment.

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js is required to run the smoke test."
    exit 1
}

& $node (Join-Path $PSScriptRoot 'smoke-test-rubric-admin.mjs')
exit $LASTEXITCODE
