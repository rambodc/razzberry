# Razzberry CI/CD with Firebase Hosting 2

This repository is set up for branch-based environments with Firebase Hosting.

Branches:
- `prod`: deploys to the production Firebase project
- `dev`: deploys to the development Firebase project
- `main`: default branch; no deploys are triggered

## Setup

1. Create two Firebase projects (or use existing):
   - Production project ID → replace in `.firebaserc` as `YOUR_FIREBASE_PROJECT_ID_PROD`
   - Development project ID → replace in `.firebaserc` as `YOUR_FIREBASE_PROJECT_ID_DEV`

2. Generate a CI token and add it to GitHub:
   - Install Firebase CLI locally and login: `npm i -g firebase-tools && firebase login`
   - Create token: `firebase login:ci`
   - In GitHub → Settings → Secrets and variables → Actions → `New repository secret`
     - Name: `FIREBASE_TOKEN`
     - Value: paste the token

3. Branch protection (recommended):
   - Protect `prod` and `dev` as needed; leave `main` as default.

4. Deploy behavior:
   - Push to `dev` → deploys Hosting to the `dev` Firebase project
   - Push to `prod` → deploys Hosting to the `prod` Firebase project
   - Open PR targeting `dev` or `prod` → creates a preview channel URL

5. App code:
   - Hosting serves from `public/` by default. Replace `public/` with your built app or change `firebase.json` accordingly.
   - If using a Node-based build (Vite/Next/React/etc.), ensure `package.json` exists with a `build` script.

## Files of interest
- `.github/workflows/firebase-hosting.yml` – CI workflow
- `.firebaserc` – maps branch aliases to Firebase project IDs
- `firebase.json` – Hosting configuration
- `public/` – default hosting directory

## Notes
- The workflow expects a repository secret `FIREBASE_TOKEN`.
- You can switch Hosting `public` dir or add rewrites in `firebase.json` as needed.
