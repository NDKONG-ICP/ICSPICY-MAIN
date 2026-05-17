import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ICSpicyIdentityKitProvider } from "./providers/IdentityKitProvider";

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
      staleTime: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ICSpicyIdentityKitProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ICSpicyIdentityKitProvider>,
);
