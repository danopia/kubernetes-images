import { default as DatadogApi } from "https://deno.land/x/datadog_api@v0.1.3/mod.ts";
import type { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.3/v1/metrics.ts";
import { fixedInterval } from "https://crux.land/4MC9JG#fixed-interval@v1";

export type { MetricSubmission };
export { readAll } from "https://deno.land/std@0.170.0/streams/read_all.ts";

const datadog = DatadogApi.fromEnvironment(Deno.env);

export async function runMetricsLoop(
  gather: () => Promise<MetricSubmission[]>,
  intervalMinutes: number,
  loopName: string,
) {
  for await (const dutyCycle of fixedInterval(intervalMinutes * 60 * 1000)) {
    try {

      const data = await gather();

      // Our own loop-health metric
      data.push({
        metric_name: `surfboard.app.duty_cycle`,
        points: [{value: dutyCycle*100}],
        tags: [`app:${loopName}`],
        interval: 60,
        metric_type: 'gauge',
      });

      // Submit all metrics
      try {
        await datadog.v1Metrics.submit(data);
      } catch (err) {
        console.log(new Date().toISOString(), 'eh', err.message);
        await datadog.v1Metrics.submit(data);
      }

    } catch (err) {
      console.log(new Date().toISOString(), '!!', err.message);
    }
  }
}
