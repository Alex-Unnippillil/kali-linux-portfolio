use wasm_bindgen::prelude::*;
use pcap_parser::{create_reader, PcapBlockOwned};
use pcap_parser::pcapng::Block;
use pcap_parser::traits::PcapNGPacketBlock;
use std::collections::HashMap;
use std::io::Cursor;
use serde::Serialize;

#[derive(Serialize)]
pub struct FlowInfo {
    flow: String,
    start: u32,
    end: u32,
}

#[derive(Serialize)]
pub struct PacketInfo {
    flow: String,
    proto: String,
    data: Vec<u8>,
}

#[derive(Serialize)]
pub struct ParseResult {
    flows: Vec<FlowInfo>,
    protocols: HashMap<String, u32>,
    packets: Vec<PacketInfo>,
}

#[wasm_bindgen]
pub fn parse_pcap(data: &[u8]) -> Result<JsValue, JsValue> {
    let mut flows: HashMap<String, (u32, u32)> = HashMap::new();
    let mut protocols: HashMap<String, u32> = HashMap::new();
    let mut packets: Vec<PacketInfo> = Vec::new();

    let cursor = Cursor::new(data);
    let mut reader = create_reader(65536, cursor)
        .map_err(|e| JsValue::from_str(&format!("failed to parse header: {:?}", e)))?;

    loop {
        match reader.next() {
            Ok((offset, block)) => {
                if let PcapBlockOwned::Legacy(b) = &block {
                    let packet = b.data;
                    if packet.len() >= 34 && packet[12] == 0x08 && packet[13] == 0x00 {
                        let proto = packet[23];
                        let src = format!("{}.{}.{}.{}", packet[26], packet[27], packet[28], packet[29]);
                        let dst = format!("{}.{}.{}.{}", packet[30], packet[31], packet[32], packet[33]);
                        let flow_key = format!("{src} -> {dst}");
                        let ts = b.ts_sec;
                        let entry = flows.entry(flow_key.clone()).or_insert((ts, ts));
                        entry.1 = ts;
                        let proto_name = match proto {
                            6 => "TCP",
                            17 => "UDP",
                            1 => "ICMP",
                            _ => "OTHER",
                        };
                        *protocols.entry(proto_name.to_string()).or_insert(0) += 1;
                        packets.push(PacketInfo { flow: flow_key, proto: proto_name.to_string(), data: packet.to_vec() });
                    }
                } else if let PcapBlockOwned::NG(b) = &block {
                    match b {
                        Block::EnhancedPacket(epb) => {
                            let packet = epb.packet_data();
                            if packet.len() >= 34 && packet[12] == 0x08 && packet[13] == 0x00 {
                                let proto = packet[23];
                                let src = format!("{}.{}.{}.{}", packet[26], packet[27], packet[28], packet[29]);
                                let dst = format!("{}.{}.{}.{}", packet[30], packet[31], packet[32], packet[33]);
                                let flow_key = format!("{src} -> {dst}");
                                let ts = epb.decode_ts(0, 1).0;
                                let entry = flows.entry(flow_key.clone()).or_insert((ts, ts));
                                entry.1 = ts;
                                let proto_name = match proto {
                                    6 => "TCP",
                                    17 => "UDP",
                                    1 => "ICMP",
                                    _ => "OTHER",
                                };
                                *protocols.entry(proto_name.to_string()).or_insert(0) += 1;
                                packets.push(PacketInfo { flow: flow_key, proto: proto_name.to_string(), data: packet.to_vec() });
                            }
                        }
                        Block::SimplePacket(spb) => {
                            let packet = spb.packet_data();
                            if packet.len() >= 34 && packet[12] == 0x08 && packet[13] == 0x00 {
                                let proto = packet[23];
                                let src = format!("{}.{}.{}.{}", packet[26], packet[27], packet[28], packet[29]);
                                let dst = format!("{}.{}.{}.{}", packet[30], packet[31], packet[32], packet[33]);
                                let flow_key = format!("{src} -> {dst}");
                                let ts = 0;
                                let entry = flows.entry(flow_key.clone()).or_insert((ts, ts));
                                entry.1 = ts;
                                let proto_name = match proto {
                                    6 => "TCP",
                                    17 => "UDP",
                                    1 => "ICMP",
                                    _ => "OTHER",
                                };
                                *protocols.entry(proto_name.to_string()).or_insert(0) += 1;
                                packets.push(PacketInfo { flow: flow_key, proto: proto_name.to_string(), data: packet.to_vec() });
                            }
                        }
                        _ => {}
                    }
                }
                reader.consume(offset);
            }
            Err(pcap_parser::PcapError::Eof) => break,
            Err(pcap_parser::PcapError::Incomplete) => {
                reader
                    .refill()
                    .map_err(|e| JsValue::from_str(&format!("refill error: {:?}", e)))?;
            }
            Err(e) => {
                return Err(JsValue::from_str(&format!(
                    "parse error {:?}. file may be truncated or unsupported",
                    e
                )));
            }
        }
    }

    let flows_vec: Vec<FlowInfo> = flows
        .into_iter()
        .map(|(flow, (start, end))| FlowInfo { flow, start, end })
        .collect();
    let result = ParseResult { flows: flows_vec, protocols, packets };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}
