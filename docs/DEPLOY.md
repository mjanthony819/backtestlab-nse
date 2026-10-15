# Deploying for free

Two pieces: a static frontend and a small Python API. Neither needs a card.

## 1. API on Hugging Face Spaces (Docker, free, no card)

1. huggingface.co -> New Space -> SDK **Docker** -> blank -> public. Name it `backtestlab-nse`.
2. Space settings -> Variables: set `CORS_ORIGINS` to `https://mjanthony819.github.io`
3. Put this repo's files in the Space (Files tab -> upload, or push with git using a Hugging Face access token).
   The Space `README.md` needs this header block:
   ```
   ---
   title: BacktestLab NSE API
   sdk: docker
   app_port: 7860
   ---
   ```
4. The API URL is `https://<you>-backtestlab-nse.hf.space`. Check `/health`.

The Dockerfile listens on 7860 and serves the committed price cache. Free Spaces sleep when idle, which is why the UI shows a "waking server" banner.

Alternative: Render free web service using `render.yaml` (Render may ask for a card at signup).

## 2. Frontend on GitHub Pages

1. Repo settings -> Pages -> Source: **GitHub Actions**.
2. Repo settings -> Secrets and variables -> Actions -> Variables: `API_URL` = the API URL from step 1 (no trailing slash).
3. Run the `deploy-frontend` workflow (or push a change under `frontend/`).
4. Site: `https://<you>.github.io/backtestlab-nse/`

Vercel also works: import the repo, root directory `frontend`, env var `NEXT_PUBLIC_API_URL`. Leave `NEXT_PUBLIC_BASE_PATH` empty there.
