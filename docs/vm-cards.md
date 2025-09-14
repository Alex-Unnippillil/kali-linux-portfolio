# Kali Linux VM Cards

This quick reference lists verified virtual machine images with recommended settings and SHA256 checksums.

## VirtualBox
- **OS Type:** Linux (64-bit)
- **CPUs:** 2
- **Memory:** 4 GB
- **Network:** NAT
- **Download:** [kali-linux-2025.2-virtualbox-amd64.7z](https://cdimage.kali.org/kali-2025.2/kali-linux-2025.2-virtualbox-amd64.7z)
- **SHA256:** `ed777af3272fb93bc1a9e61307499ebf213bc9f24ca06e92551d8427b91da972`

## VMware
- **Compatibility:** Workstation 17 / ESXi 7+
- **CPUs:** 2
- **Memory:** 4 GB
- **Network:** NAT
- **Download:** [kali-linux-2025.2-vmware-amd64.7z](https://cdimage.kali.org/kali-2025.2/kali-linux-2025.2-vmware-amd64.7z)
- **SHA256:** `a938953601709665fc84858c6658d800c4ba48b237c564b0bc5815bba80449ba`

## UTM (Apple Silicon)
- **Architecture:** ARM64
- **CPUs:** 4
- **Memory:** 4 GB
- **Disk:** 40 GB QCOW2
- **Download:** [kali-linux-2025.2-installer-arm64.iso](https://cdimage.kali.org/kali-2025.2/kali-linux-2025.2-installer-arm64.iso)
- **SHA256:** `02774081e05c386ff1263ff2604b6b37ab9f0de68cb72d02caa239633ea4b2d9`

To verify integrity, run `sha256sum <filename>` and compare the result with the SHA256 value above.
