import ShellyIot from 'shelly-iot';
import { hostname } from 'node:os';
import { client as Datadog, v1 as DatadogV1 } from '@datadog/datadog-api-client';

const shelly = new ShellyIot({});
shelly.listen(() => console.log('Listening'));

const latestViewpoints = new Map();
const prevTotals = new Map();

shelly.on('update-device-status', (deviceId, status) => {
  // Deduplicate retransissions
  const latestViewpoint = latestViewpoints.get(deviceId);
  const viewpoint = JSON.stringify(status);
  if (latestViewpoint == viewpoint) {
    console.log(new Date(), 'duplicate status from', deviceId);
    return;
  }
  latestViewpoints.set(deviceId, viewpoint);

  // Handle particular device types
  const [deviceType, deviceSerial, _] = deviceId.split('#');

  if (deviceType == 'SHHT-1') {
    // https://shelly-api-docs.shelly.cloud/gen1/#shelly-h-amp-t
    const fields = new Map(status.G.map(x => [x[1], x[2]]));
    const payload = {
      temperature_c: fields.get(3101),
      temperature_f: fields.get(3102),
      humidity: fields.get(3103),
      sensor_error: fields.get(3115),
      battery_level: fields.get(3111),
      triggers: fields.get(9102), // ["button"]
      config_changed: fields.get(9103),
    };

    const prevCfgChg = prevTotals.get(`${deviceSerial}-config_changed`) ?? -1;
    prevTotals.set(`${deviceSerial}-config_changed`, payload['config_changed']);
    if (payload['config_changed'] == prevCfgChg) {
      delete payload['config_changed'];
    } else {
      if (prevCfgChg == -1) {
        payload['config_changed'] = 0; // ignore whatever happened before our process
      } else if (payload['config_changed'] > prevCfgChg) {
        payload['config_changed'] -= prevCfgChg;
      }
    }

    reportPayload(deviceSerial, 'ht', payload);
    console.log(new Date(), deviceSerial, payload);

  } else if (deviceType == 'SHPLG-S') {
    // https://shelly-api-docs.shelly.cloud/gen1/#shelly-plug-plugs
    const fields = new Map(status.G.map(x => [x[1], x[2]]));
    const payload = {
      'config_changed': fields.get(9103), // e.g. 0
      'relay.on': fields.get(1101), // e.g. 1
      'relay.watts': fields.get(4101), // e.g. 22.46
      'relay.watt_minutes.sum': fields.get(4103), // e.g. 78
      'relay.overpower': fields.get(6102), // e.g. 0
      'relay.overpower_value': fields.get(6109), // e.g. 0
      'device.temp_c': fields.get(3104), // e.g. 23.28
      'device.temp_f': fields.get(3105), // e.g. 73.9
      'device.overtemp': fields.get(6101), // e.g. 0
    };

    if (payload['device_temp_c'] == 0) {
      delete payload['device_temp_c'];
      delete payload['device_temp_f'];
    }

    const prevCfgChg = prevTotals.get(`${deviceSerial}-config_changed`) ?? -1;
    prevTotals.set(`${deviceSerial}-config_changed`, payload['config_changed']);
    if (payload['config_changed'] == prevCfgChg) {
      delete payload['config_changed'];
    } else {
      if (prevCfgChg == -1) {
        payload['config_changed'] = 0; // ignore whatever happened before our process
      } else if (payload['config_changed'] > prevCfgChg) {
        payload['config_changed'] -= prevCfgChg;
      }
    }

    const prevEnergy = prevTotals.get(`${deviceSerial}-energy`) ?? -1;
    prevTotals.set(`${deviceSerial}-energy`, payload['relay.watt_minutes.sum']);
    if (payload['relay.watt_minutes.sum'] == prevEnergy) {
      delete payload['relay.watt_minutes.sum'];
    } else {
      if (prevEnergy == -1) {
        payload['relay.watt_minutes.sum'] = 0; // ignore whatever happened before our process
      } else if (payload['relay.watt_minutes.sum'] > prevEnergy) {
        payload['relay.watt_minutes.sum'] -= prevEnergy;
      }
      payload['relay.watt_hours.sum'] = payload['relay.watt_minutes.sum'] / 60;
    }

    if (payload['relay.watts']) {
      console.log(new Date(), deviceSerial, payload['relay.watts'], 'watts');
    }
    reportPayload(deviceSerial, 'plug-s', payload);

  } else if (deviceType == 'SHBTN-2') {
    // https://shelly-api-docs.shelly.cloud/gen1/#shelly-button1
    const fields = new Map(status.G.map(x => [x[1], x[2]]));
    const payload = {
      config_changed: fields.get(9103), // e.g. 0
      input_event: fields.get(2102), // e.g. 'S', 'L', 'SS', 'SSS'
      input_event_count: fields.get(2103), // e.g. 3
      sensor_error: fields.get(3115), // e.g. 0
      on_charger: fields.get(3112), // e.g. 1
      battery_level: fields.get(3111), // e.g. 90
      triggers: fields.get(9102), // ["button"]
    };
    reportPayload(deviceSerial, 'button', payload);
    console.log(new Date(), deviceSerial, payload);

  } else console.log('Unknown device', deviceId);
});

async function reportPayload(deviceSerial, deviceType, payload) {
  const host = hostname();
  const tags = [
    `shelly_id:${deviceSerial}`,
    `shelly_product:${deviceType}`,
  ];
  if (deviceSerial == '701364') {
    tags.push(`sensor_name:living room`);
    tags.push(`sensor_location:living room`);
  }
  if (deviceSerial == '7013A6') {
    tags.push(`sensor_name:balcony`);
    tags.push(`sensor_location:outside`);
    // tags.push(`sensor_name:bedroom`);
    // tags.push(`sensor_location:bedroom`);
  }
  if (deviceSerial == '4022D8895F23') {
    tags.push(`sensor_name:fridge`);
    tags.push(`sensor_location:living room`);
  }
  if (deviceSerial == '3C6105F43782') {
    tags.push(`sensor_name:button`);
  }

  const series = new Array(); // <DatadogV1.Series>
  const now = Math.floor(Date.now() / 1000);

  for (const item of Object.entries(payload)) {
    const type = (item[0] == 'config_changed' || item[0].endsWith('.sum'))
      ? 'count' : 'gauge';
    if (typeof item[1] == 'number') {
      series.push({
        host, tags,
        metric: 'shelly.'+item[0],
        points: [[now, item[1]]],
        type,
      });
    } else if (Array.isArray(item[1])) {
      series.push({
        host,
        tags: [ ...tags,
          ...item[1].map(x => `sensor_${item[0]}:${x}`),
        ],
        metric: 'shelly.'+item[0],
        points: [[now, 1]],
        type,
      });
    }
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
