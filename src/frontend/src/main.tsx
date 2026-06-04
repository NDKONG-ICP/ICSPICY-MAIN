import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@nfid/identitykit/react/styles.css";
import { ICSpicyAuthProvider } from "./providers/AuthProvider";
import { OisyWalletProvider } from "./providers/OisyWalletProvider";

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
  <QueryClientProvider client={queryClient}>
    <ICSpicyAuthProvider>
      <OisyWalletProvider>
        <App />
      </OisyWalletProvider>
    </ICSpicyAuthProvider>
  </QueryClientProvider>,
);
