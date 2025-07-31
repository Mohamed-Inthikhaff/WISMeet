# Set environment variables
$env:MONGODB_URI = "mongodb://localhost:27017/wismeet"
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_ZGVjaWRpbmctZWFyd2lnLTI1LmNsZXJrLmFjY291bnRzLmRldiQ"
$env:CLERK_SECRET_KEY = "sk_test_i9fzVoV8TY8UvIAb3MwF3BoMY73APhfNJs7hOuNl48"
$env:NEXT_PUBLIC_STREAM_API_KEY = "pmx7dhj5kn7j"
$env:STREAM_SECRET_KEY = "3jj98de3nez3v48zyaub4rzv72wgrhrfz2tabzbn29ntkkf628dxwttdgqphb3cg"
$env:NEXT_PUBLIC_BASE_URL = "http://localhost:3000"
$env:NODE_ENV = "development"

# Start MongoDB if not running
$mongodbProcess = Get-Process -Name "mongod" -ErrorAction SilentlyContinue
if (-not $mongodbProcess) {
    Write-Host "Starting MongoDB..."
    Start-Process -FilePath "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" -ArgumentList "--dbpath", "C:\data\db", "--port", "27017" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

# Check if MongoDB is running
$mongoPort = netstat -an | findstr :27017
if ($mongoPort) {
    Write-Host "MongoDB is running on port 27017"
} else {
    Write-Host "MongoDB is not running. Please start it manually."
    exit 1
}

# Start the server
Write-Host "Starting the application server..."
npm run dev 