import { useQuery } from "@tanstack/react-query";

let sdkInitialized = false;

export default function useZamaRelayerInstance() {
  const { data, isLoading, isError, error, status } = useQuery({
    queryKey: ["zamaRelayerInstance"],
    queryFn: async () => {
      console.debug("🔍 [ZamaRelayer] Starting initialization...");

      if (typeof window === "undefined") {
        return null;
      }


      if (!window.relayerSDK) {
        console.error("❌ [ZamaRelayer] Relayer SDK not loaded on window object");
        throw new Error("Relayer SDK not loaded on window object");
      }
      const { initSDK, createInstance } = window.relayerSDK;

      if (typeof initSDK !== "function") {
        console.error("❌ [ZamaRelayer] initSDK is not a function");
        throw new Error("initSDK is not available on window.relayerSDK");
      }

      if (typeof createInstance !== "function") {
        console.error("❌ [ZamaRelayer] createInstance is not a function");
        throw new Error("createInstance is not available on window.relayerSDK");
      }

      if (!sdkInitialized) {
        console.debug("🔍 [ZamaRelayer] Calling initSDK()...");
        const startTime = Date.now();
        try {
          const initResult = await initSDK();
          const duration = Date.now() - startTime;
          console.debug(`✅ [ZamaRelayer] initSDK() completed in ${duration}ms, result:`, initResult);
        } catch (initError) {
          const duration = Date.now() - startTime;
          console.error(`❌ [ZamaRelayer] initSDK() failed after ${duration}ms:`, initError);
          throw initError;
        }
        sdkInitialized = true;
        console.debug("🚀 [ZamaRelayer] SDK initialized successfully");
      } else {
        console.debug("🔍 [ZamaRelayer] SDK already initialized, skipping initSDK()");
      }

      console.debug("🔍 [ZamaRelayer] window.relayerSDK keys (after init):", Object.keys(window.relayerSDK || {}));

      // FHEVM v0.9: Only use ZamaEthereumConfig (SepoliaConfig removed)
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
        console.error(`❌ [ZamaRelayer] createInstance() failed after ${duration}ms:`, createError);
        throw createError;
      }
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount: number) => {
      console.debug(
        `🔍 [ZamaRelayer] Retry attempt ${failureCount}, window.relayerSDK exists:`,
        typeof window !== "undefined" && !!window.relayerSDK
      );
      if (typeof window !== "undefined" && !window.relayerSDK && failureCount < 10) {
        console.error("❌ [ZamaRelayer] Relayer SDK not found on window object.");
        return true;
      }
      return false;
    },
    retryDelay: 1_000,
    staleTime: 60 * 60_000,
  });

  return data;
}
