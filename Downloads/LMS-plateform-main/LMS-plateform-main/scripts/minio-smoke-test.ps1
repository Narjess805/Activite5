$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$bytes = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1cAAAAASUVORK5CYII=")
$tmp = Join-Path $env:TEMP "minio-smoke.png"
[IO.File]::WriteAllBytes($tmp, $bytes)

try {
    $response = curl.exe -s -X POST `
        -F "file=@$tmp;type=image/png" `
        -F "kind=course_thumbnail" `
        -F "course_id=2" `
        http://127.0.0.1:8001/api/courses/media/upload

    $json = $response | ConvertFrom-Json
    if (-not $json.url) {
        throw "Upload endpoint did not return a public URL."
    }

    $fetched = Invoke-WebRequest -UseBasicParsing $json.url
    if ($fetched.StatusCode -ne 200) {
        throw "Uploaded object was not publicly retrievable."
    }

    Write-Host "MinIO smoke test passed:"
    Write-Host " - Upload URL: $($json.url)"
    Write-Host " - Object path: $($json.object_name)"
    Write-Host " - Fetch status: $($fetched.StatusCode)"
}
finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
