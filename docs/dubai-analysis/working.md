# New Build Deploy

## Using Git (Active)

npm.cmd run deploy

## Step 1: From scratch

cd D:\web-apps\voiceestate-ai
npm.cmd run deploy:vinext

## Step 2: set the three secrets again. Run these one at a time. Use the admin username and password you want:

npx.cmd cf workers secrets update PROPHUNTERS_USERNAME --worker voiceestate-ai --type secret_text --text "admin"

npx.cmd cf workers secrets update PROPHUNTERS_PASSWORD --worker voiceestate-ai --type secret_text --text "YourPassword123"

npx.cmd cf workers secrets update PROPHUNTERS_SESSION_SECRET --worker voiceestate-ai --type secret_text --text ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))

