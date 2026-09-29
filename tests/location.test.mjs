import test from "node:test";
import assert from "node:assert/strict";
import {
  isDeviceLocation,
  MAX_BUSINESS_LOCATION_ACCURACY_METERS,
} from "../src/lib/location.ts";

test("accepts finite coordinates with device-reported accuracy within the business threshold", () => {
  assert.equal(isDeviceLocation({
    latitude: -1.2864,
    longitude: 36.8172,
    accuracy: MAX_BUSINESS_LOCATION_ACCURACY_METERS,
  }), true);
});

test("rejects missing, out-of-range, or insufficiently accurate device coordinates", () => {
  assert.equal(isDeviceLocation(null), false);
  assert.equal(isDeviceLocation({ latitude: -1, longitude: 36 }), false);
  assert.equal(isDeviceLocation({ latitude: 91, longitude: 36, accuracy: 10 }), false);
  assert.equal(isDeviceLocation({ latitude: -1, longitude: 181, accuracy: 10 }), false);
  assert.equal(isDeviceLocation({ latitude: -1, longitude: 36, accuracy: 101 }), false);
  assert.equal(isDeviceLocation({ latitude: Number.NaN, longitude: 36, accuracy: 10 }), false);
});
