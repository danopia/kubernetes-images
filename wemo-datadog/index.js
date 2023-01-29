import Wemo from 'wemo-client';
import { hostname } from 'node:os';
import { client as Datadog, v1 as DatadogV1 } from '@datadog/datadog-api-client';

const wemo = new Wemo();

const macs = [];
function discover() {
  return wemo.discover(function(deviceInfo) {
    const {macAddress} = deviceInfo;
    if (macs.includes(macAddress)) {
      return;
    }
    macs.push(macAddress);
    return connectTo(deviceInfo);
  });
}

setInterval(discover, 60 * 1000); // minutely
discover();

function connectTo(deviceInfo) {
  const {deviceType, friendlyName, macAddress} = deviceInfo;
  if (deviceType !== 'urn:Belkin:device:insight:1') {
    return;
  }
  console.log('Found Wemo device', friendlyName);
  const client = wemo.client(deviceInfo);
  const tags = ['friendly_name:' + friendlyName, 'mac_address:' + macAddress];
  let lastUsageMark = -1;
  let lastTimeMark = -1;
  const bin = bool => bool ? 1 : 0;
  function reportStats(state, mW, data) {
    const gauges = {
      'wemo.output.is_enabled': bin(+state > 0),
      'wemo.output.is_running': bin(+state === 1),
      'wemo.current_draw.watts': mW / 1000,
    };
    const increments = {};

    // const stateMap = {
    //   '0': 0, // off
    //   '8': 1, // idle
    //   '1': 2 // running
    // };
    // sendLine(['_sc', 'wemo.output_state', stateMap[state]]);
    const thisUsageMark = +data.TodayConsumed;
    const thisTimeMark = +data.OnFor;
    // Don't report deltas until we have previous data
    if (lastUsageMark !== -1) {
      if (thisUsageMark > lastUsageMark) {
        const usageDelta = thisUsageMark - lastUsageMark;
        console.log(friendlyName, 'consumed', usageDelta / 1000 / 60, 'watt-hours');
        increments['wemo.consumed.watt_hours'] = usageDelta / 1000 / 60;
        increments['wemo.consumed.watt_minutes'] = usageDelta / 1000;
      }
      if (thisTimeMark > lastTimeMark) {
        const timeDelta = thisTimeMark - lastTimeMark;
        console.log(friendlyName, 'ran', timeDelta, 'seconds');
        increments['wemo.output.running_seconds'] = timeDelta; // Report inactive time as well
      } else {
        increments['wemo.output.running_seconds'] = 0;
      }
    }

    reportPayload(tags, gauges, increments)
    lastUsageMark = thisUsageMark;
    lastTimeMark = thisTimeMark;
  }
  function checkStats() {
    return client.getInsightParams(function(err, ...args) {
      if (err) {
        console.log(new Date().toString(), friendlyName, 'Encountered', err);
        // return sendLine(['_sc', 'wemo.reachable', 2], ['m:' + err.message]);
      } else {
        reportStats(...args);
        // return sendLine(['_sc', 'wemo.reachable', 0]);
      }
    });
  }
  setInterval(checkStats, 30 * 1000);
  checkStats();
}

async function reportPayload(tags, gauges, increments) {
  const host = hostname();
  const series = []; // <DatadogV1.Series>
  const now = Math.floor(Date.now() / 1000);

  for (const item of Object.entries(gauges)) {
    series.push({
      host, tags,
      metric: ''+item[0],
      points: [[now, item[1]]],
      type: 'gauge',
    });
  }
  for (const item of Object.entries(increments)) {
    series.push({
      host, tags,
      metric: ''+item[0],
      points: [[now, item[1]]],
      type: 'count',
    });
  }

  const configuration = Datadog.createConfiguration();
  await new DatadogV1.MetricsApi(configuration).submitMetrics({
    body: { series },
  });
}

// make sure the api key is set up
const configuration = Datadog.createConfiguration();
await new DatadogV1.MetricsApi(configuration).submitMetrics({
  body: { series: [] },
});
