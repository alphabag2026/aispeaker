process.env.NODE_ENV = "development";
process.argv = [process.argv[0], "tsx", "watch", "server/_core/index.ts"];
await import("tsx/cli");
