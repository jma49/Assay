import { Redis } from "@upstash/redis";
import { serverEnv } from "@/lib/config/env";

/** Upstash Redis over HTTP: no connections to hold, which suits serverless functions. */
const redis = new Redis({
  url: serverEnv().UPSTASH_REDIS_REST_URL!,
  token: serverEnv().UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;
