use wasm_bindgen::prelude::*;
use pcap_parser::{create_reader, PcapBlockOwned};
use pcap_parser::pcapng::Block;
use pcap_parser::traits::PcapNGPacketBlock;
use serde::Serialize;
use std::collections::HashMap;
use std::io::Cursor;

#[derive(Serialize)]
pub struct PacketInfo {
    index: u32,
    ts: u64,
    proto: String,
    src: String,
    dst: String,
    src_port: u16,
    dst_port: u16,
    data: Vec<u8>,
}

#[derive(Serialize)]
pub struct ParseResult {
    packets: Vec<PacketInfo>,
    protocols: HashMap<String, u32>,
    malformed: u32,
}

fn classify_packet(packet: &[u8], index: u32, ts: u64) -> Option<PacketInfo> {
    if packet.len() < 34 || packet[12] != 0x08 || packet[13] != 0x00 {
        return None;
    }
    let proto = packet[23];
    if packet.len() < 38 {
        return None;
    }
    let src = format!("{}.{}.{}.{}", packet[26], packet[27], packet[28], packet[29]);
    let dst = format!("{}.{}.{}.{}", packet[30], packet[31], packet[32], packet[33]);
    let src_port = u16::from_be_bytes([packet[34], packet[35]]);
    let dst_port = u16::from_be_bytes([packet[36], packet[37]]);
    let proto_name = match proto {
        6 => {
            if src_port == 80 || dst_port == 80 || src_port == 8080 || dst_port == 8080 {
                "HTTP"
            } else {
                "TCP"
            }
        }
        17 => {
            if src_port == 53 || dst_port == 53 {
                "DNS"
            } else {
                "UDP"
            }
        }
        _ => "OTHER",
    };
    Some(PacketInfo {
        index,
        ts,
        proto: proto_name.to_string(),
        src,
        dst,
        src_port,
        dst_port,
        data: packet.to_vec(),
    })
}

#[wasm_bindgen]
pub fn parse_pcap(data: &[u8]) -> Result<JsValue, JsValue> {
    let mut packets: Vec<PacketInfo> = Vec::new();
    let mut protocols: HashMap<String, u32> = HashMap::new();
    let mut malformed: u32 = 0;

    let cursor = Cursor::new(data);
    let mut reader = create_reader(65536, cursor)
        .map_err(|e| JsValue::from_str(&format!("failed to parse header: {:?}", e)))?;

    let mut index: u32 = 0;
    loop {
        match reader.next() {
            Ok((offset, block)) => {
                let mut handled = false;
                if let PcapBlockOwned::Legacy(b) = &block {
                    if let Some(info) = classify_packet(b.data, index, (b.ts_sec as u64) * 1_000_000 + b.ts_usec as u64) {
                        *protocols.entry(info.proto.clone()).or_insert(0) += 1;
                        packets.push(info);
                        handled = true;
                    }
                } else if let PcapBlockOwned::NG(b) = &block {
                    match b {
                        Block::EnhancedPacket(epb) => {
                            let packet = epb.packet_data();
                            let (sec, nsec) = epb.decode_ts(0, 1);
                            if let Some(info) = classify_packet(packet, index, sec * 1_000_000 + nsec / 1000) {
                                *protocols.entry(info.proto.clone()).or_insert(0) += 1;
                                packets.push(info);
                                handled = true;
                            }
                        }
                        Block::SimplePacket(spb) => {
                            let packet = spb.packet_data();
                            if let Some(info) = classify_packet(packet, index, 0) {
                                *protocols.entry(info.proto.clone()).or_insert(0) += 1;
                                packets.push(info);
                                handled = true;
                            }
                        }
                        _ => {}
                    }
                }
                if handled {
                    index += 1;
                } else {
                    malformed += 1;
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

    let result = ParseResult {
        packets,
        protocols,
        malformed,
    };
    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}
