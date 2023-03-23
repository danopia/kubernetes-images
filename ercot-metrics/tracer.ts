import {
  DenoFetchInstrumentation,
  DenoTracerProvider,
  OTLPTraceFetchExporter,
  Resource,
} from "https://deno.land/x/observability@v0.3.1/mod.ts";

new DenoTracerProvider({
  resource: new Resource({
    'service.name': 'ercot-metrics',
    'deployment.environment': 'production',
  }),
  instrumentations: [
    new DenoFetchInstrumentation(),
  ],
  batchSpanProcessors: [
    new OTLPTraceFetchExporter(),
  ],
});
