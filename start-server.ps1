# Check if MongoDB is running
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
    Write-Host "You can install MongoDB from: https://www.mongodb.com/try/download/community"
    exit 1
}

# Start the application
Write-Host "Starting the application server..."
npm run dev 