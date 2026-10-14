$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Invoke-JsonRequest {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    $request = @{
        Uri = $Url
        Method = $Method
        UseBasicParsing = $true
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $request.ContentType = "application/json"
        $request.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    $response = Invoke-WebRequest @request
    if ([string]::IsNullOrWhiteSpace($response.Content)) {
        return $null
    }
    return $response.Content | ConvertFrom-Json
}

$base = "http://localhost"
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "smoke-$stamp@example.com"
$password = "Password123!"

$results = [System.Collections.Generic.List[object]]::new()

try {
    $frontend = Invoke-WebRequest -UseBasicParsing $base
    Assert-True ($frontend.StatusCode -eq 200) "Frontend did not return HTTP 200."
    $results.Add("Frontend reachable")

    $courses = Invoke-JsonRequest -Method "GET" -Url "${base}:8001/api/courses"
    Assert-True ($courses.Count -gt 0) "Course service returned no courses."
    $results.Add("Course service returned $($courses.Count) courses")

    $analytics = Invoke-JsonRequest -Method "GET" -Url "${base}:8003/api/analytics/dashboard"
    Assert-True ($null -ne $analytics.total_enrollments) "Analytics dashboard payload is missing total_enrollments."
    $results.Add("Analytics dashboard reachable")

    $register = Invoke-JsonRequest -Method "POST" -Url "${base}:8002/api/auth/register" -Body @{
        name = "Smoke Test User"
        email = $email
        password = $password
        role = "student"
    }
    Assert-True ($null -ne $register.token) "User registration did not return a token."
    $results.Add("User registration succeeded")

    $login = Invoke-JsonRequest -Method "POST" -Url "${base}:8002/api/auth/login" -Body @{
        email = $email
        password = $password
    }
    Assert-True ($null -ne $login.token) "User login did not return a token."
    $results.Add("User login succeeded")

    $authHeaders = @{ Authorization = "Bearer $($login.token)" }

    $enrollment = Invoke-JsonRequest -Method "POST" -Url "${base}:8001/api/courses/1/enroll" -Headers $authHeaders -Body @{
        user_id = $login.user._id
    }
    Assert-True ($enrollment.course_id -eq 1) "Enrollment did not target course 1."
    $results.Add("Enrollment endpoint succeeded")

    $recommendations = Invoke-JsonRequest -Method "POST" -Url "${base}:8004/api/ai/recommendations" -Body @{
        user_id = $login.user._id
        current_course_id = 1
        interests = @("python", "data")
    }
    Assert-True ($recommendations.recommendations.Count -gt 0) "Recommendations endpoint returned no items."
    $results.Add("Recommendations endpoint returned $($recommendations.recommendations.Count) items")

    $chat = Invoke-JsonRequest -Method "POST" -Url "${base}:8004/api/ai/chat" -Body @{
        course_id = 1
        message = "What will I learn in this course?"
        history = @()
    }
    Assert-True (-not [string]::IsNullOrWhiteSpace($chat.reply)) "Chat endpoint returned an empty reply."
    $results.Add("Chat endpoint returned a reply")

    $quiz = Invoke-JsonRequest -Method "POST" -Url "${base}:8004/api/ai/quiz/generate" -Body @{
        course_id = 1
        num_questions = 2
    }
    Assert-True ($quiz.questions.Count -ge 1) "Quiz endpoint returned no questions."
    $results.Add("Quiz endpoint returned $($quiz.questions.Count) questions")

    Write-Host "Smoke tests passed:"
    $results | ForEach-Object { Write-Host " - $_" }
    exit 0
}
catch {
    Write-Error "Smoke test failed: $($_.Exception.Message)"
    exit 1
}
