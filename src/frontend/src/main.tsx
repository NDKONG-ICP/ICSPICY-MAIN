import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: 0 — always refetch when component mounts or query is invalidated.
      // This prevents cached `false` values for isAdmin/profile from being served
      // after sign-in, which is the root cause of the admin tab not appearing.
      staleTime: 0,
      // gcTime: 0 would be too aggressive for all queries (e.g. products, plants).
      // Per-query gcTime: 0 is set on useIsAdmin and useProfile specifically.
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </QueryClientProvider>,
);
