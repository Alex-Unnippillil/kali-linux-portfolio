import { analyzeWifiCapture, parsePcap } from '../workers/pcapParser';
import type { ParsedPacket, WifiAnalysisResult } from '../types/pcap';

export const parsePcapFallback = (buffer: ArrayBuffer): ParsedPacket[] =>
  parsePcap(buffer);

export const analyzeWifiCaptureFallback = (
  buffer: ArrayBuffer,
): WifiAnalysisResult => analyzeWifiCapture(buffer);
