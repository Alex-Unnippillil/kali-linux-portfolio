rule SampleRule {
  meta:
    description = "Detects sample string"
  strings:
    $a = "MALWARE"
    $b = { 31 32 33 }
  condition:
    $a and $b
}
