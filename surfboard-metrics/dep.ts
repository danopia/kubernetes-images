export {
  DefaultRegistry,
  type OpenMetric,
  runMetricsServer,
} from "https://deno.land/x/observability@v0.1.2/sinks/openmetrics/server.ts";

// export { fetch } from "https://deno.land/x/socket_fetch@v0.1/mod.ts";
export { fetch } from "https://raw.githubusercontent.com/cloudydeno/deno-socket_fetch/d654c61099e8b5ce26a9537b83210b66a450ad0f/mod.ts";