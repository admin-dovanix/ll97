export type AppEnv = {
  appName: string;
  environment: "development" | "staging" | "production";
  apiPort: number;
  workerPollIntervalMs: number;
};

export const defaultAppEnv: AppEnv = {
  appName: "AirWise",
  environment: (process.env.NODE_ENV as AppEnv["environment"]) ?? "development",
  apiPort: Number(process.env.AIRWISE_API_PORT ?? 4000),
  workerPollIntervalMs: Number(process.env.AIRWISE_WORKER_POLL_INTERVAL_MS ?? 10_000)
};
