/** Public config from /env.json (updated on deploy without rebaking all chunks). */

export type RuntimeEnv = {
  drop_studio_url?: string;
  walletconnect_project_id?: string;
  backend_canister_id?: string;
  agent_hub_canister_id?: string;
  hedera_drop_token_id?: string;
};

let cache: RuntimeEnv | null = null;
let loading: Promise<RuntimeEnv> | null = null;

export function loadRuntimeEnv(): Promise<RuntimeEnv> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = fetch("/env.json", { cache: "no-store" })
      .then(async (res) => (res.ok ? ((await res.json()) as RuntimeEnv) : {}))
      .catch(() => ({}))
      .then((data) => {
        cache = data;
        return data;
      });
  }
  return loading;
}

export function walletConnectProjectId(): string {
  const vite = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
  if (vite) return vite;
  return cache?.walletconnect_project_id?.trim() ?? "";
}
