import { useQuery } from "@tanstack/react-query";

let sdkInitialized = false;

export default function useZamaRelayerInstance() {
  const { data, isLoading, isError, error, status } = useQuery({
    queryKey: ["zamaRelayerInstance"],
    queryFn: async () => {
      if (typeof window === "undefined") {
        return null;
      }

      if (!window.relayerSDK) {
        throw new Error("Relayer SDK not loaded on window object");
      }
      const { initSDK, createInstance } = window.relayerSDK;

      if (typeof initSDK !== "function") {
        throw new Error("initSDK is not available on window.relayerSDK");
      }

      if (typeof createInstance !== "function") {
        throw new Error("createInstance is not available on window.relayerSDK");
      }

      if (!sdkInitialized) {
        const startTime = Date.now();
        try {
          const initResult = await initSDK();
          const duration = Date.now() - startTime;
        } catch (initError) {
          const duration = Date.now() - startTime;
          throw initError;
        }
        sdkInitialized = true;
      }

      const config = window.relayerSDK.SepoliaConfig || window.relayerSDK.ZamaEthereumConfig;

      if (!config) {
        throw new Error(
          "ZamaEthereumConfig is not available on window.relayerSDK after initialization"
        );
      }

      if (typeof config !== "object") {
        throw new Error(`Config is not an object, got: ${typeof config}`);
      }

      if (!("verifyingContractAddressDecryption" in config)) {
        throw new Error("Config is missing required property: verifyingContractAddressDecryption");
      }

      const startTime = Date.now();
      try {
        const instance = await createInstance(config);
        return instance;
      } catch (createError) {
        const duration = Date.now() - startTime;
        throw createError;
      }
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount: number) => {
      if (typeof window !== "undefined" && !window.relayerSDK && failureCount < 10) {
        return true;
      }
      return false;
    },
    retryDelay: 1_000,
    staleTime: 60 * 60_000,
  });

  return data;
}
