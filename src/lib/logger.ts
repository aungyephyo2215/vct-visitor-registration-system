import pino from "pino";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_FORMAT = process.env.LOG_FORMAT || "pretty";

const logger = pino({
  level: LOG_LEVEL,
  ...(LOG_FORMAT === "pretty"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export default logger;
