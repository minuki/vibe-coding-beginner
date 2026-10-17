# Mentoring portal workshop

## Audience and scope

- Support beginners using the GitHub Copilot app. Explain results in plain Korean and run necessary commands yourself when permitted rather than asking the participant to type them.
- Read README.md for the participant journey and docs/instructor-guide.md for service contracts, commands, deployment prerequisites, and limitations.
- Keep tasks small and preserve working login, application persistence, role authorization, and Knowledge search. Prefer changing app/web for UI requests; do not replace real API calls with hardcoded browser data.
- Do not imply profile editing, session scheduling, or automatic matching already exists. These are extension tasks.

## Starting and updating locally

- Confirm the current repository/session path and available tools. Use a local execution session for the participant's Docker engine; cloud sessions cannot access their localhost.
- Check Docker Desktop engine readiness and Docker Compose availability. Installation, login, licenses, and privilege prompts may require the participant.
- Create .env from .env.example only if missing; never overwrite existing configuration or expose secret values.
- Start this project's services using `docker compose up --build --detach --wait`. Inspect state before replacing an already running stack.
- Static web files are copied into the web image. After UI edits, rebuild using `docker compose up --build --detach --wait web`, then tell the participant to refresh their browser.
- Verify the actual web response and auth, API/DB, and Knowledge health endpoints. Report the correct URL, including any changed host port.
- For failures, inspect this project's service status and bounded recent logs. Distinguish actual verification from assumptions. Do not claim success for an unexecuted test.
- Use existing smoke tests. If host Node.js is unavailable, pipe scripts/smoke-test.mjs into the running API container's Node.js as shown in the instructor guide. Explain that the test adds and accepts a demo application.

## Safety and data

- Use fictional workshop data only. Never request real company credentials, personal data, access tokens, or secret values in chat.
- Preserve databases and volumes on normal stop/rebuild. Use `docker compose down` to stop the stack without deleting data.
- Before any reset, explain the exact project's data to be deleted and require explicit approval. Never use global Docker prune or stop/delete unrelated containers, volumes, processes, or Azure resources.
- Do not kill another project's process to resolve a port conflict. Propose changing this project's host port.
- Do not commit .env or secret values. Authentication uses fixed mock tokens and is not production authentication.

## GitHub and deployment

- Before submitting, inspect the remote, current branch, and changes; do not overwrite or discard participant work.
- Use an existing feature branch or create one when on main. Commit/push only the intended work and create a PR when asked; describe tested behavior and anything not verified.
- Do not merge a PR or deploy directly unless explicitly requested. PR approval is not a merge.
- Main push triggers ACA deployment only after the instructor configures Azure, OIDC, GitHub variables/secrets, Environment protections, and repository review rules. Template creation does not copy these settings.
- If GitHub tooling or permissions are unavailable, explain the blocker and the minimum browser steps. Never invent a PR, CI result, deployment URL, or granted permission.
- ACA databases in this workshop are ephemeral and separate from local data. Never promise persistence across cloud restarts or deployments.
