import { Redis } from "@upstash/redis";

/** Upstash Redis over HTTP: no connections to hold, which suits serverless functions. */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;
