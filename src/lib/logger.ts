import pino from "pino";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_FORMAT = process.env.LOG_FORMAT || "pretty";
const LOG_TIMEZONE = process.env.LOG_TIMEZONE || process.env.TZ || "Asia/Bangkok";

const timeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOG_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZoneName: "longOffset",
});

function localTimestamp() {
  const parts = Object.fromEntries(
    timeFormatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  const offset = parts.timeZoneName?.replace("GMT", "") || "+07:00";

  return `,"time":"${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${offset}"`;
}

const logger = pino({
  level: LOG_LEVEL,
  timestamp: localTimestamp,
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
