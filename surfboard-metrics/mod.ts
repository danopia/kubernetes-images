import { DefaultRegistry, OpenMetric, runMetricsServer } from "./dep.ts";
import { fetchSignalMetrics } from "./signal.ts";

// TODO: ideally the registry can support async metrics fetchers
// TODO: why have a registry class anyway, why not simply Array<MetricsSource>
let latestMetrics: OpenMetric[] = [];
async function fetchMetrics() {
  latestMetrics = [
    ...(await fetchSignalMetrics()),
  ];
}

DefaultRegistry.sources.push({
  scrapeMetrics: function* () {
    yield* latestMetrics;
    fetchMetrics(); // for next time
  },
});

runMetricsServer({ port: 9090 });
console.info('Serving metrics on :9090');