use wasm_bindgen::prelude::*;
use pcap_parser::{LegacyPcapSlice, PcapBlockOwned};
use std::collections::HashMap;
use serde::Serialize;

#[derive(Serialize)]
pub struct FlowInfo {
    flow: String,
    start: u32,
    end: u32,
}

#[derive(Serialize)]
pub struct ParseResult {
    flows: Vec<FlowInfo>,
    protocols: HashMap<String, u32>,
}

#[wasm_bindgen]
pub fn parse_pcap(data: &[u8]) -> Result<JsValue, JsValue> {
    let mut slice = LegacyPcapSlice::from_slice(data).map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
    let mut flows: HashMap<String, (u32, u32)> = HashMap::new();
    let mut protocols: HashMap<String, u32> = HashMap::new();

    while let Some(res) = slice.next() {
        let block = res.map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
        if let PcapBlockOwned::Legacy(b) = block {
            let packet = b.data;
            if packet.len() >= 34 && packet[12] == 0x08 && packet[13] == 0x00 {
                let proto = packet[23];
                let src = format!("{}.{}.{}.{}", packet[26], packet[27], packet[28], packet[29]);
                let dst = format!("{}.{}.{}.{}", packet[30], packet[31], packet[32], packet[33]);
                let flow_key = format!("{src} -> {dst}");
                let ts = b.ts_sec;
                let entry = flows.entry(flow_key).or_insert((ts, ts));
                entry.1 = ts;
                let proto_name = match proto {
                    6 => "TCP",
                    17 => "UDP",
                    1 => "ICMP",
                    _ => "OTHER",
                };
                *protocols.entry(proto_name.to_string()).or_insert(0) += 1;
            }
        }
    }

    let flows_vec: Vec<FlowInfo> = flows
        .into_iter()
        .map(|(flow, (start, end))| FlowInfo { flow, start, end })
        .collect();
    let result = ParseResult { flows: flows_vec, protocols };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}
