import { parseDocument } from 'yaml';
import {
  convertJsonToYaml,
  convertYamlToJson,
} from '../../../apps/data-converter/components/YamlBridge';

type KeyOrder = string[][];

const collectObjectKeyOrders = (value: unknown): KeyOrder => {
  const orders: KeyOrder = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (node && typeof node === 'object') {
      const entries = Object.entries(node as Record<string, unknown>);
      if (entries.length) {
        orders.push(entries.map(([key]) => key));
      }
      entries.forEach(([, child]) => visit(child));
    }
  };

  visit(value);
  return orders;
};

const collectMapKeyOrders = (value: unknown): KeyOrder => {
  const orders: KeyOrder = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (node instanceof Map) {
      const keys = Array.from(node.keys()).map((key) => String(key));
      if (keys.length) {
        orders.push(keys);
      }
      for (const child of node.values()) {
        visit(child);
      }
      return;
    }

    if (node && typeof node === 'object') {
      const entries = Object.entries(node as Record<string, unknown>);
      if (entries.length) {
        orders.push(entries.map(([key]) => key));
      }
      entries.forEach(([, child]) => visit(child));
    }
  };

  visit(value);
  return orders;
};

describe('YamlBridge conversions', () => {
  it('round-trips JSON to YAML and back while keeping key order', () => {
    const jsonText = `{
  "one": 1,
  "two": {
    "alpha": true,
    "beta": "value",
    "gamma": {
      "inner": [
        { "label": "first", "score": 1 },
        { "label": "second", "score": 2 }
      ]
    }
  },
  "three": [
    { "a": 1, "b": 2 },
    { "c": 3, "d": 4 }
  ]
}`;

    const { output: yamlFromJson } = convertJsonToYaml(jsonText);
    const { output: jsonRoundTrip } = convertYamlToJson(yamlFromJson);

    const original = JSON.parse(jsonText);
    const roundTripped = JSON.parse(jsonRoundTrip);

    expect(roundTripped).toEqual(original);
    expect(collectObjectKeyOrders(roundTripped)).toEqual(
      collectObjectKeyOrders(original),
    );
  });

  it('round-trips YAML to JSON and back while keeping map ordering', () => {
    const yamlText = `service: api
metadata:
  owner: ops
  teams:
    - name: response
      pager: true
    - name: platform
      pager: false
pipelines:
  build:
    steps:
      - checkout
      - test
      - package
  deploy:
    strategy: rolling
    regions:
      - us-east-1
      - eu-central-1
`;

    const { output: jsonFromYaml } = convertYamlToJson(yamlText);
    const { output: yamlRoundTrip } = convertJsonToYaml(jsonFromYaml);

    const originalDoc = parseDocument(yamlText);
    const roundTripDoc = parseDocument(yamlRoundTrip);

    const originalOrders = collectMapKeyOrders(
      originalDoc.toJS({ mapAsMap: true }),
    );
    const roundTripOrders = collectMapKeyOrders(
      roundTripDoc.toJS({ mapAsMap: true }),
    );

    expect(JSON.parse(jsonFromYaml)).toEqual(
      JSON.parse(convertYamlToJson(yamlRoundTrip).output),
    );
    expect(roundTripOrders).toEqual(originalOrders);
  });
});
