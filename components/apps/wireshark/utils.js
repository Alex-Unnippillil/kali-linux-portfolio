export const protocolName = (proto) => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return proto;
  }
};

// Determine the color class for a packet based on user rules
export const getRowColor = (packet, rules) => {
  const proto = protocolName(packet.protocol);
  const rule = rules.find(
    (r) =>
      (r.protocol && r.protocol === proto) ||
      (r.ip && (packet.src === r.ip || packet.dest === r.ip))
  );
  return rule ? rule.color : '';
};
