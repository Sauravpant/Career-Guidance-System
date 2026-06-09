import winston from "winston";

const environment = process.env.NODE_ENV;

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `{ ${timestamp}  [${level.toUpperCase()}] -> ${message} }`;
});

const logger = winston.createLogger({
  level: environment === "production" ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat,
    winston.format.colorize({ all: true }),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

export default logger;
