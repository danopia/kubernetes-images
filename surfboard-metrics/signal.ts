import { fetch, OpenMetric } from "./dep.ts";

export async function fetchSignalMetrics(): Promise<OpenMetric[]> {
  const resp = await fetch('http://192.168.100.1/cmSignalData.htm');
  if (!resp.ok) {
    console.error(`cmSignalData.htm gave HTTP ${resp.status}`);
    return [];
  }
  const body = await resp.text();

  const [
    downstreamSection,
    upstreamSection,
    codewordSection,
  ] = body.split('<CENTER>').slice(1);

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

  console.log(new Date, 'uncorrectable', channels
    .map(x => x.uncorrectable)
    .reduce((a,b) => a+b, 0));

  return [{
    prefix: 'docsis_codewords',
    type: 'counter',
    values: new Map(channels.flatMap(x => [
      [`_total{docsis_channel="${x.channel_id}",docsis_codeword="unerrored"}`, x.unerrored],
      [`_total{docsis_channel="${x.channel_id}",docsis_codeword="correctable"}`, x.correctable],
      [`_total{docsis_channel="${x.channel_id}",docsis_codeword="uncorrectable"}`, x.uncorrectable],
    ])),
  }];
}





