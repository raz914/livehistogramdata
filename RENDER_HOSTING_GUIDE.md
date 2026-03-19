# Hosting This App On Render

This guide explains how to host the full app on Render, including:

- the public website
- the live server/API
- the admin tools

It is written for a client or non-technical team member to follow step by step.

## What You Are Hosting

This project has 2 parts:

- `Frontend`: the website people visit to submit numbers and view results
- `Backend`: the server that stores submissions in memory and powers the live updates

For Render, the simplest setup is:

1. One `Web Service` for the backend server
2. One `Static Site` for the frontend website

## Important Note Before You Start

The current server stores data in memory only.

That means:

- if the server restarts, the collected responses are lost
- if Render redeploys the backend, the collected responses are lost
- if you need permanent storage, the app would need a database added later

For short live events, demos, classrooms, workshops, or one-time sessions, this setup is usually fine.

## What You Need

Before starting, make sure you have:

- a Render account
- this project pushed to GitHub
- permission to connect that GitHub repository to Render

## Recommended Render Setup

Create these two Render services from the same GitHub repo:

### 1. Backend Web Service

Use this for the Express server in `server/index.js`.

Render settings:

- `Service Type`: Web Service
- `Environment`: Node
- `Root Directory`: leave blank
- `Build Command`: `npm install`
- `Start Command`: `npm run start`

Render will automatically provide a `PORT` value, and this server already supports that.

### 2. Frontend Static Site

Use this for the Vite frontend.

Render settings:

- `Service Type`: Static Site
- `Root Directory`: leave blank
- `Build Command`: `npm install && npm run build`
- `Publish Directory`: `dist`

## Step 1: Deploy The Backend First

In Render:

1. Click `New +`
2. Choose `Web Service`
3. Connect the GitHub repo
4. Select the repository
5. Fill in the backend settings:

```text
Name: livehistogramdata-api
Environment: Node
Build Command: npm install
Start Command: npm run start
```

## Step 2: Add Backend Environment Variables

In the backend Render service, open `Environment` and add the following values.

### Required

`ADMIN_RESET_KEY`

Example:

```text
ADMIN_RESET_KEY=choose-a-strong-secret-key
```

This protects the admin reset and admin settings endpoints.

### Optional

`ALLOW_MULTIPLE_SUBMISSIONS_PER_SESSION`

- Use `false` for normal production use
- Use `true` only for testing

Example:

```text
ALLOW_MULTIPLE_SUBMISSIONS_PER_SESSION=false
```

`IP_COOLDOWN_SECONDS`

- Controls how long the same IP must wait before submitting again
- Good production example: `30`

Example:

```text
IP_COOLDOWN_SECONDS=30
```

## Step 3: Deploy The Frontend

After the backend is live:

1. Copy the backend URL from Render
2. It will look something like:

```text
https://livehistogramdata-api.onrender.com
```

3. In Render, click `New +`
4. Choose `Static Site`
5. Connect the same GitHub repo
6. Fill in the frontend settings:

```text
Name: livehistogramdata-web
Build Command: npm install && npm run build
Publish Directory: dist
```

## Step 4: Add Frontend Environment Variable

In the frontend Static Site, add this environment variable:

```text
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

Replace the URL with your actual backend Render URL.

Example:

```text
VITE_API_BASE_URL=https://livehistogramdata-api.onrender.com
```

This is required so the website knows where to send submissions and where to open the live event stream.

## Step 5: Redeploy The Frontend

If you created the frontend before setting `VITE_API_BASE_URL`, trigger a redeploy after saving the variable.

This ensures the frontend rebuilds with the correct backend URL.

## Final Result

Once both services are live:

- participants use the frontend URL
- the frontend talks to the backend API
- live results update through Server-Sent Events
- the admin page works using the backend `ADMIN_RESET_KEY`

## App URLs

After deployment, the main frontend pages will be:

- `/submit` for public submissions
- `/results` for the live graph
- `/admin` for admin controls

Example:

```text
https://your-frontend-site.onrender.com/submit
https://your-frontend-site.onrender.com/results
https://your-frontend-site.onrender.com/admin
```

## Recommended Production Values

These are sensible starting values for a real event:

Backend environment variables:

```text
ADMIN_RESET_KEY=use-a-strong-private-secret
ALLOW_MULTIPLE_SUBMISSIONS_PER_SESSION=false
IP_COOLDOWN_SECONDS=30
```

Frontend environment variable:

```text
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```

## How To Test After Deployment

Use this checklist after both services are live:

1. Open the frontend `/submit` page
2. Submit a number
3. Open `/results` in another tab
4. Confirm the histogram updates
5. Confirm the live total changes without refreshing
6. Open `/admin`
7. Enter the same `ADMIN_RESET_KEY`
8. Confirm admin settings load properly

## If Something Does Not Work

### Frontend loads, but no data appears

Usually this means the frontend cannot reach the backend.

Check:

- the frontend `VITE_API_BASE_URL` is correct
- the backend service is running
- the backend URL starts with `https://`

### Admin page does not load settings

Usually this means the admin key is missing or incorrect.

Check:

- `ADMIN_RESET_KEY` exists in the backend environment
- you are typing the exact same value into the admin page

### Live updates do not appear

The app uses Server-Sent Events on `/api/stream`.

Check:

- the backend service is healthy
- the frontend points to the correct backend URL
- the backend has fully finished deploying

### Data disappeared

This is expected with the current version if the backend restarts.

The current app does not use a database yet.

## Health Check

You can verify the backend is running by opening:

```text
https://your-backend-service.onrender.com/api/health
```

You should see:

```json
{"ok":true}
```

## Recommended Client Handover Notes

When sharing this with a client, it is helpful to explain:

- the frontend and backend are two separate Render services
- the backend must stay live for data to remain available during the event
- this version is best for temporary event use, not long-term archived storage
- if permanent records are needed later, a database can be added

## Quick Copy/Paste Summary

### Backend Render Service

```text
Type: Web Service
Environment: Node
Build Command: npm install
Start Command: npm run start
```

### Backend Environment Variables

```text
ADMIN_RESET_KEY=choose-a-strong-secret-key
ALLOW_MULTIPLE_SUBMISSIONS_PER_SESSION=false
IP_COOLDOWN_SECONDS=30
```

### Frontend Render Static Site

```text
Type: Static Site
Build Command: npm install && npm run build
Publish Directory: dist
```

### Frontend Environment Variable

```text
VITE_API_BASE_URL=https://your-backend-service.onrender.com
```
