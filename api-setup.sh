#!/usr/bin/env bash
# api-setup.sh — point Claude Code + opencode at the bootcamp LLM proxy.
#   ./api-setup.sh <KEY> <PROXY_URL>
#   VIBE_KEY=sk-... VIBE_PROXY=https://<proxy> ./api-setup.sh
#   ./api-setup.sh --restore            # bring previous Claude config back
#   ./api-setup.sh --restore <bak-dir>  # restore a specific snapshot
#
# Cross-platform: Linux, macOS, WSL. If you run inside WSL but Claude Code is a
# NATIVE WINDOWS install (claude.exe surfaced on the WSL PATH), this configures
# THAT install — it writes the proxy config into Windows' .claude/settings.json
# so the same `claude` you already use just works. No second install needed.
#
# TIP: `source api-setup.sh` applies shell env to your CURRENT shell immediately.
have() { command -v "$1" >/dev/null 2>&1; }

# ---------- sourced? (then env exports survive into your shell) ----------
# Detect BEFORE touching shell options. When sourced, `set -e` / `exit` act on
# the user's INTERACTIVE shell and would close their terminal.
SOURCED=0
if [ -n "${ZSH_EVAL_CONTEXT:-}" ]; then
  case "$ZSH_EVAL_CONTEXT" in *:file) SOURCED=1;; esac
elif [ -n "${BASH_SOURCE:-}" ]; then
  [ "${BASH_SOURCE[0]}" != "$0" ] && SOURCED=1
fi

# Strict mode ONLY when executed. Sourced: leave the shell's options untouched
# (a stray `set -e` would close the terminal on the next failing command) and
# the `exit`s below become `return`s via the SOURCED guard.
if [ "$SOURCED" = 0 ]; then
  set -euo pipefail
fi

# ---------- resolve this script's path (run or sourced, bash or zsh) ----------
if [ -n "${BASH_SOURCE:-}" ]; then
  SELF="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  SELF="$(eval 'printf %s "${(%):-%x}"')"
else
  SELF="$0"
fi
case "$SELF" in
  bash|-bash|zsh|-zsh|sh|-sh|"") SELF_CMD="bash api-setup.sh" ;;
  *)                              SELF_CMD="bash $SELF" ;;
esac

# ---------- end-of-run debug summary (success OR failure; NO secrets) ----------
# Printed via EXIT trap (only when run, not sourced). Students paste this into
# #setup-help. Key + proxy URL are intentionally hidden — shown only as set/unset.
diag() {
  rc=$?
  distro="$(grep -E '^PRETTY_NAME=' /etc/os-release 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')"
  [ -z "$distro" ] && distro="?"
  iswsl=no
  if grep -qiE "microsoft|wsl" /proc/version 2>/dev/null; then iswsl=yes; fi
  printf '\n\033[1;36m──────── api-setup debug (paste into #setup-help) ────────\033[0m\n'
  [ "$rc" -eq 0 ] && echo "result    : SUCCESS" || echo "result    : FAILED (exit $rc)"
  echo "date      : $(date -u +%FT%TZ 2>/dev/null || true)"
  echo "os        : $(uname -s 2>/dev/null) $(uname -r 2>/dev/null)"
  echo "arch      : $(uname -m 2>/dev/null)"
  echo "distro    : $distro"
  echo "wsl       : $iswsl"
  echo "shell     : ${SHELL:-?}"
  echo "node      : $(node --version 2>/dev/null || echo -)"
  echo "claude    : $(claude --version 2>/dev/null | head -1 || echo -)"
  echo "opencode  : $(opencode --version 2>/dev/null | head -1 || echo -)"
  echo "claude cfg: ${CLAUDE_DIR:-<not resolved>} (kind=${CLAUDE_KIND:-?})"
  echo "proxy     : $([ -n "${PROXY:-}" ] && echo configured || echo unset)   # URL hidden"
  echo "key       : $([ -n "${KEY:-}" ] && echo configured || echo unset)   # value hidden"
  printf '\033[1;36m──────────────────────────────────────────────────────────\033[0m\n'
}
[ "$SOURCED" = 0 ] && trap diag EXIT

# ---------- detect Claude install: nix (Linux/macOS) | windows (via WSL) ----------
# Sets: CLAUDE_KIND, CLAUDE_DIR (holds settings.json/.credentials.json),
#       CLAUDE_JSON (the .claude.json login/config file).
detect_claude() {
  local bin; bin="$(command -v claude 2>/dev/null || true)"
  CLAUDE_KIND="nix"
  case "$bin" in
    /mnt/*) CLAUDE_KIND="windows" ;;   # a Windows binary leaked into WSL PATH
  esac
  if [ "$CLAUDE_KIND" = "windows" ]; then
    local up="" wh=""
    up="$(cmd.exe /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r' || true)"
    [ -n "$up" ] && wh="$(wslpath "$up" 2>/dev/null || true)"
    if [ -z "$wh" ] || [ ! -d "$wh" ]; then
      # fallback: carve /mnt/<drive>/Users/<name> out of the binary path
      wh="$(printf '%s' "$bin" | sed -E 's#(/mnt/[a-z]/Users/[^/]+).*#\1#')"
    fi
    # Guard: if the Windows home still doesn't resolve to a real directory
    # (cmd.exe unavailable, localized/non-standard profile path, or a false
    # /mnt match), DON'T fall through to "$wh/.claude" — an empty $wh would
    # target the root filesystem. Fall back to the Linux config instead.
    if [ -n "$wh" ] && [ -d "$wh" ]; then
      CLAUDE_DIR="$wh/.claude"
      CLAUDE_JSON="$wh/.claude.json"
      echo "Detected Claude Code: native Windows install (via WSL) — home: $wh"
    else
      echo "WARN: a Windows claude ($bin) is on PATH but its Windows home could not" >&2
      echo "      be resolved — using the Linux config (~/.claude) instead. If your" >&2
      echo "      Windows claude ignores the proxy, configure it manually (see README)." >&2
      CLAUDE_KIND="nix"
      CLAUDE_DIR="$HOME/.claude"
      CLAUDE_JSON="$HOME/.claude.json"
    fi
  else
    CLAUDE_DIR="$HOME/.claude"
    CLAUDE_JSON="$HOME/.claude.json"
  fi
}

# ---------- full timestamped backup of the previous Claude config ----------
# Snapshots .claude.json + .credentials.json + settings.json to
# ~/.claude-backup-<ts>/ (always on the Linux/macOS side) with a manifest that
# records each file's origin path so --restore can put them back exactly.
backup_claude() {
  local ts bak f
  ts="$(date +%Y%m%d-%H%M%S)"
  bak="$HOME/.claude-backup-$ts"
  mkdir -p "$bak"
  : > "$bak/manifest.tsv"
  for f in "$CLAUDE_JSON" "$CLAUDE_DIR/.credentials.json" "$CLAUDE_DIR/settings.json"; do
    if [ -f "$f" ]; then
      cp -p "$f" "$bak/$(basename "$f")"
      printf '%s\t%s\n' "$f" "$(basename "$f")" >> "$bak/manifest.tsv"
    fi
  done
  if [ -s "$bak/manifest.tsv" ]; then
    printf '%s\n' "$bak" > "$HOME/.claude-backup-latest"
    echo "Backed up previous Claude config -> $bak"
    echo "  (restore later: $SELF_CMD --restore)"
  else
    rmdir "$bak" 2>/dev/null || true
  fi
}

# ---------- restore ----------
if [ "${1:-}" = "--restore" ]; then
  detect_claude
  BAK="${2:-}"
  [ -z "$BAK" ] && BAK="$(cat "$HOME/.claude-backup-latest" 2>/dev/null || true)"
  if [ -n "$BAK" ] && [ -f "$BAK/manifest.tsv" ]; then
    while IFS=$'\t' read -r origin base; do
      [ -f "$BAK/$base" ] || continue
      mkdir -p "$(dirname "$origin")"
      cp -p "$BAK/$base" "$origin" && echo "  restored $origin"
    done < "$BAK/manifest.tsv"
    echo "Restored previous Claude config from $BAK"
  else
    # legacy fallback (older api-setup only backed up credentials)
    CRED="$CLAUDE_DIR/.credentials.json"; CRED_BAK="$CRED.vibe-bak"
    if [ -f "$CRED_BAK" ]; then
      mv "$CRED_BAK" "$CRED"; echo "Restored personal Claude login (legacy backup)."
    else
      echo "No backup found (looked for ~/.claude-backup-* and $CRED_BAK)." >&2
    fi
  fi
  # drop the proxy env block from settings.json so the personal login takes over
  if have node && [ -f "$CLAUDE_DIR/settings.json" ]; then
    node -e '
      const fs=require("fs"),f=process.argv[1];
      let j={};try{j=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}
      if(j.env){for(const k of ["ANTHROPIC_BASE_URL","ANTHROPIC_AUTH_TOKEN","ANTHROPIC_API_KEY","ANTHROPIC_MODEL","ANTHROPIC_SMALL_FAST_MODEL","CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"]) delete j.env[k];
       if(Object.keys(j.env).length===0) delete j.env;}
      fs.writeFileSync(f,JSON.stringify(j,null,2));
    ' "$CLAUDE_DIR/settings.json" 2>/dev/null || true
  fi

  # remove the vibe-code-tours block from every shell profile (it re-exports the
  # proxy vars on each new terminal, so leaving it in undoes the restore)
  RMS="# >>> vibe-code-tours >>>"; RME="# <<< vibe-code-tours <<<"
  for RP in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.profile"; do
    [ -f "$RP" ] || continue
    if grep -q "$RMS" "$RP" 2>/dev/null; then
      rtmp=$(mktemp); sed "/$RMS/,/$RME/d" "$RP" > "$rtmp" && mv "$rtmp" "$RP"
      echo "  removed proxy block from $RP"
    fi
  done

  # delete the standalone proxy env file (new layout)
  if rm -f "$HOME/.config/vibe-code-tours/env.sh" 2>/dev/null; then
    echo "  removed $HOME/.config/vibe-code-tours/env.sh"
  fi
  rmdir "$HOME/.config/vibe-code-tours" 2>/dev/null || true

  # The proxy env vars may still be LIVE in the current shell. They override
  # both settings.json AND the restored login, so the personal Claude won't work
  # until they are cleared. unset only reaches the current shell when SOURCED.
  VIBE_VARS="ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY ANTHROPIC_MODEL ANTHROPIC_SMALL_FAST_MODEL CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY OPENAI_BASE_URL OPENAI_API_KEY OPENAI_MODEL VIBE_PROXY VIBE_KEY"
  # shellcheck disable=SC2086
  unset $VIBE_VARS 2>/dev/null || true
  if [ "$SOURCED" = "1" ]; then
    echo "OK Restored. Proxy env vars cleared in THIS shell — personal Claude login is active."
    return 0
  fi
  echo ""
  echo "WARN  Proxy env vars may still be active in your current terminal."
  echo "   Open a NEW terminal, or re-run sourced to clear them in place:"
  echo "       source api-setup.sh --restore"
  echo "   ...or clear them now by hand:"
  echo "       unset $VIBE_VARS"
  exit 0
fi

# ---------- load a key file (beginner path: edit vibe-key.env, run) ----------
SELF_DIR="$(cd "$(dirname "$SELF")" 2>/dev/null && pwd || echo .)"
for KF in "$SELF_DIR/vibe-key.env" "./vibe-key.env"; do
  if [ -f "$KF" ]; then
    set -a
    # shellcheck source=/dev/null
    . "$KF"
    set +a
    echo "Loaded key file: $KF"; break
  fi
done

KEY="${1:-${VIBE_KEY:-}}"
PROXY="${2:-${VIBE_PROXY:-}}"

[ -n "$PROXY" ] || { echo "ERROR: proxy URL not set. ./api-setup.sh <KEY> <PROXY_URL>" >&2; { [ "$SOURCED" = 1 ] && return 1 || exit 1; }; }
case "$PROXY" in https://*) : ;; *) echo "ERROR: PROXY must start https://" >&2; { [ "$SOURCED" = 1 ] && return 1 || exit 1; };; esac
PROXY="${PROXY%/}"; PROXY="${PROXY%/v1}"   # strip trailing slash + accidental /v1

if [ -z "$KEY" ]; then printf "Paste your key (sk-...): "; read -r KEY; fi
case "$KEY" in sk-*) : ;; *) echo "ERROR: key must start sk-" >&2; { [ "$SOURCED" = 1 ] && return 1 || exit 1; };; esac

# ---------- locate + back up the Claude install ----------
detect_claude
backup_claude

# 1. remove stored Claude login (a saved login overrides our env/settings)
CRED="$CLAUDE_DIR/.credentials.json"
if [ -f "$CRED" ]; then
  rm -f "$CRED"
  echo "Cleared stored Claude login (backed up above; restore: $SELF_CMD --restore)"
fi

# 2. write proxy config into Claude's settings.json env block.
#    This is the cross-platform anchor: Claude Code reads its OWN settings.json
#    regardless of shell — so a native Windows claude.exe launched from WSL
#    picks it up too (a shell-profile export alone would NOT reach it).
mkdir -p "$CLAUDE_DIR"
SF="$CLAUDE_DIR/settings.json"
[ -f "$SF" ] || printf '{}\n' > "$SF"
if have node; then
  VIBE_KEY_V="$KEY" VIBE_PROXY_V="$PROXY" node -e '
    const fs=require("fs"),f=process.argv[1];
    let j={};try{j=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}
    j.env=Object.assign({},j.env,{
      ANTHROPIC_BASE_URL:process.env.VIBE_PROXY_V,
      ANTHROPIC_AUTH_TOKEN:process.env.VIBE_KEY_V,
      ANTHROPIC_MODEL:"mimo-v2.5-pro",
      ANTHROPIC_SMALL_FAST_MODEL:"mimo-v2.5",
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY:"1"
    });
    delete j.env.ANTHROPIC_API_KEY;  // Bearer-only; avoids the auth-conflict warning + cleans stale installs
    fs.writeFileSync(f,JSON.stringify(j,null,2));
  ' "$SF"
  echo "Claude proxy config -> $SF (env block)"
else
  echo "WARN: node not found — could not patch settings.json." >&2
  echo "      Shell env (below) still configures a Linux claude, but a Windows" >&2
  echo "      claude.exe needs node to apply. Install Node, re-run." >&2
fi

# 3. shell env file + a one-line hook in the profile.
#    The proxy env lives in its OWN file so removal is trivial: delete the file
#    (or run --restore). The profile only gets a single guarded `source` line,
#    wrapped in markers so it is easy to find and strip.
case "${SHELL##*/}" in
  zsh)  PROFILE="$HOME/.zshrc" ;;
  bash) PROFILE="$HOME/.bashrc" ;;
  *)    PROFILE="$HOME/.profile" ;;
esac
touch "$PROFILE"
VIBE_ENV_DIR="$HOME/.config/vibe-code-tours"; VIBE_ENV="$VIBE_ENV_DIR/env.sh"
mkdir -p "$VIBE_ENV_DIR"
# Only ANTHROPIC_AUTH_TOKEN is set (Bearer auth). Setting ANTHROPIC_API_KEY too
# makes Claude Code warn "Auth conflict: both a token and an API key are set".
cat > "$VIBE_ENV" <<EOF
# Vibe Code Tours LLM proxy env — sourced from your shell profile.
# Remove it all:  $SELF_CMD --restore
# Or by hand: delete this file + the '# >>> vibe-code-tours >>>' line in your profile.
export VIBE_PROXY="$PROXY"
# Claude Code (Anthropic-compatible) — base has NO /v1, Bearer auth via AUTH_TOKEN
export ANTHROPIC_BASE_URL="\$VIBE_PROXY"
export ANTHROPIC_AUTH_TOKEN="$KEY"
# force proxy models so Claude Code never requests claude-opus-* (403)
export ANTHROPIC_MODEL="mimo-v2.5-pro"
export ANTHROPIC_SMALL_FAST_MODEL="mimo-v2.5"
# let /model picker list proxy models
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"
# opencode / OpenAI-compatible — base HAS /v1
export OPENAI_BASE_URL="\$VIBE_PROXY/v1"
export OPENAI_API_KEY="$KEY"
vibe-model() { export OPENAI_MODEL="\$1"; echo "model: \$1"; }
EOF
chmod 600 "$VIBE_ENV" 2>/dev/null || true
echo "Proxy env file -> $VIBE_ENV"
MS="# >>> vibe-code-tours >>>"; ME="# <<< vibe-code-tours <<<"
if grep -q "$MS" "$PROFILE" 2>/dev/null; then
  tmp=$(mktemp); sed "/$MS/,/$ME/d" "$PROFILE" > "$tmp" && mv "$tmp" "$PROFILE"
fi
cat >> "$PROFILE" <<EOF
$MS
[ -f "$VIBE_ENV" ] && . "$VIBE_ENV"
$ME
EOF

# 4. opencode config — model list pulled LIVE from the proxy so adding a model on
#    the gateway needs NO change here: re-run this script and it appears. Single
#    source of truth = config.yaml -> GET /v1/models. Static fallback if offline.
OC="$HOME/.config/opencode"; mkdir -p "$OC"
MODELS_JSON="$(curl -s --max-time 10 "$PROXY/v1/models" -H "Authorization: Bearer $KEY" 2>/dev/null || true)"
DISCOVERED=""
if have node; then
  # shellcheck disable=SC2016  # $-vars belong to the node script; passed via env, must not shell-expand
  DISCOVERED="$(OC_OUT="$OC/opencode.json" VIBE_PROXY_V="$PROXY" VIBE_KEY_V="$KEY" MODELS_JSON="$MODELS_JSON" node -e '
    const fs=require("fs");
    const proxy=process.env.VIBE_PROXY_V, key=process.env.VIBE_KEY_V;
    // internal alias remaps (gpt-*/claude-*/o1*) are not user-facing models
    const isAlias=id=>/^(gpt-|claude-[0-9]|claude-(haiku|sonnet|opus)|o1$|o1-|chatgpt|text-)/i.test(id);
    let ids=[];
    try{ ids=(JSON.parse(process.env.MODELS_JSON||"{}").data||[]).map(m=>m.id).filter(Boolean).filter(x=>!isAlias(x)); }catch(e){}
    if(!ids.length) ids=["mimo-v2.5","mimo-v2.5-pro","deepseek-flash"]; // offline fallback
    const LABEL={"mimo-v2.5":"MiMo v2.5 (fast)","mimo-v2.5-pro":"MiMo v2.5 Pro (reasoning)","deepseek-flash":"DeepSeek V4 Flash","deepseek-pro":"DeepSeek V4 Pro (reasoning)"};
    const models={}; for(const id of ids) models[id]={name:LABEL[id]||id};
    const def = ids.includes("mimo-v2.5") ? "mimo-v2.5" : ids[0];
    const cfg={"$schema":"https://opencode.ai/config.json",
      provider:{vibe:{npm:"@ai-sdk/openai-compatible",name:"Vibe Code Tours",
        options:{baseURL:proxy+"/v1",apiKey:key}, models}},
      model:"vibe/"+def};
    fs.writeFileSync(process.env.OC_OUT, JSON.stringify(cfg,null,2));
    process.stdout.write(ids.join(" "));
  ' 2>/dev/null || true)"
fi
if [ ! -f "$OC/opencode.json" ]; then
  # node missing or generation failed — write a minimal static config
  cat > "$OC/opencode.json" <<OCJSON
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": { "vibe": { "npm": "@ai-sdk/openai-compatible", "name": "Vibe Code Tours",
    "options": { "baseURL": "$PROXY/v1", "apiKey": "$KEY" },
    "models": { "mimo-v2.5": { "name": "MiMo v2.5 (fast)" }, "mimo-v2.5-pro": { "name": "MiMo v2.5 Pro (reasoning)" }, "deepseek-flash": { "name": "DeepSeek V4 Flash" } } } },
  "model": "vibe/mimo-v2.5"
}
OCJSON
  DISCOVERED="mimo-v2.5 mimo-v2.5-pro deepseek-flash"
fi
echo "opencode config -> $OC/opencode.json"
[ -n "$DISCOVERED" ] && echo "  models: $DISCOVERED"

# 5. live test (Anthropic /v1/messages — what Claude Code calls)
echo ""; echo "Testing key ..."
TBODY="$(mktemp 2>/dev/null || echo /tmp/vibe_t.$$.json)"
code=$(curl -s -o "$TBODY" -w "%{http_code}" "$PROXY/v1/messages" \
  -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5","max_tokens":10,"messages":[{"role":"user","content":"ok"}]}' || true)
case "$code" in
  200) echo "OK Key works." ;;
  401) echo "FAIL Key rejected (401)." >&2; rm -f "$TBODY" 2>/dev/null || true; { [ "$SOURCED" = 1 ] && return 1 || exit 1; } ;;
  429) echo "WARN budget/rate cap (429) — key valid." ;;
  *)   echo "WARN HTTP $code — see $TBODY" ;;
esac
rm -f "$TBODY" 2>/dev/null || true

echo ""
echo "Done."
echo "  Claude settings : $SF"
echo "  Shell profile   : $PROFILE"
echo "Models: ${DISCOVERED:-mimo-v2.5 mimo-v2.5-pro deepseek-flash}"
echo "Switch: Claude Code  /model <name>   ·   opencode  --model vibe/<name>"
echo "Restore previous Claude config:  $SELF_CMD --restore"
echo ""
if [ "$SOURCED" = "1" ]; then
  # shellcheck disable=SC1090
  . "$PROFILE"
  echo "✅ Active in THIS shell. Run:  claude   (or)   opencode"
else
  echo "Activate now — copy-paste this line:"
  echo ""
  echo "    source $PROFILE"
  echo ""
  echo "(Claude Code also reads its settings.json, so a fresh terminal works too.)"
  echo "Then run:  claude   (or)   opencode"
fi
