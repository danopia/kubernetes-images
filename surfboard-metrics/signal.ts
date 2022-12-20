import { runMetricsLoop, MetricSubmission, readAll } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 1, 'signal');
}
if (import.meta.main) start();

type ChannelCodewords = {
  channel_id: number;
  unerrored: number;
  correctable: number;
  uncorrectable: number;
};
let lastCodewords = new Array<ChannelCodewords>();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  // const body = await fetch('http://192.168.100.1/cmSignalData.htm', headers('text/html')).then(x => x.text());
  const proc = Deno.run({
    cmd: ['curl', 'http://192.168.100.1/cmSignalData.htm'],
    stdin: 'null',
    stdout: 'piped',
  });
  const body = new TextDecoder().decode(await readAll(proc.stdout));
  await proc.status();

  const [
    downstreamSection,
    upstreamSection,
    codewordSection,
  ] = body.split('<CENTER>').slice(1);

  const metrics = new Array<MetricSubmission>();

  const regex = /^(?:<TD>(\d+)&nbsp; ?<\/TD>)+<\/TR>/gm;
  const matches = codewordSection.matchAll(regex);
  const table = Array.from(matches)
    .map(x => Array.from(x[0].matchAll(/\d+/g)).map(x => parseInt(x[0])));

  const channels = table[0].map((_, idx) => {
    return {
      channel_id: table[0][idx],
      unerrored: table[1][idx],
      correctable: table[2][idx],
      uncorrectable: table[3][idx],
    };
  });

  // console.log(channels);

  for (const channel of channels) {
    const lastData = lastCodewords.find(x => x.channel_id == channel.channel_id);
    if (!lastData) continue;

    // console.log({channel, lastData});

    metrics.push({
      metric_name: `docsis.codewords`,
      tags: [`docsis_channel:${channel.channel_id}`, `docsis_codeword:unerrored`],
      points: [{value: channel.unerrored - lastData.unerrored}],
      interval: 60,
      metric_type: 'count',
    });
    metrics.push({
      metric_name: `docsis.codewords`,
      tags: [`docsis_channel:${channel.channel_id}`, `docsis_codeword:correctable`],
      points: [{value: channel.correctable - lastData.correctable}],
      interval: 60,
      metric_type: 'count',
    });
    metrics.push({
      metric_name: `docsis.codewords`,
      tags: [`docsis_channel:${channel.channel_id}`, `docsis_codeword:uncorrectable`],
      points: [{value: channel.uncorrectable - lastData.uncorrectable}],
      interval: 60,
      metric_type: 'count',
    });

  }

  lastCodewords = channels;

  console.log(new Date, 'uncorrectable', channels.map(x => x.uncorrectable).reduce((a,b) => a+b, 0));

  return metrics;
}
