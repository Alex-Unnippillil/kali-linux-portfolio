# Template glossary

This glossary covers common terms used throughout the simulated tooling in the portfolio. Open the in-app glossary by clicking the
help icon in the top-right corner or pressing **Shift + /** at any time.

<a id="process-tree"></a>
## Process Tree

Hierarchy of running processes captured from the memory snapshot. For more details see the Volatility `pstree` plugin documentation.

<a id="pslist"></a>
## Process List

Active processes enumerated from the captured memory image. Refer to the Volatility `pslist` documentation for plugin specifics.

<a id="module"></a>
## Module List

DLLs and modules loaded by the selected process. This maps to Volatility's `dlllist` output.

<a id="netscan"></a>
## Network Connections

Sockets and network endpoints identified within volatile memory. Review the Volatility `netscan` documentation for the full field
breakdown.

<a id="malfind"></a>
## Malfind

Heuristics that identify injected or hidden code segments within process memory. See the Volatility `malfind` plugin for usage tips.

<a id="yara"></a>
## Yara Scan

Pattern-based rules applied to memory pages to highlight suspicious content. Learn more in the official YARA rule documentation.

<a id="severity"></a>
## Severity

Classification of a finding's risk such as Critical, High, Medium, or Low. [Tenable Severity Levels](https://docs.tenable.com/vulnerability-management/Content/SeverityLevels.htm)

<a id="plugin-family"></a>
## Plugin Family

Grouping of Nessus plugins by technology, service, or platform. [Plugin Families](https://docs.tenable.com/nessus/Content/PluginFamilies.htm)

<a id="host"></a>
## Host

Asset that generated the finding, identified by hostname or IP address. [Host summary](https://docs.tenable.com/nessus/Content/HostSummary.htm)

<a id="finding"></a>
## Finding

Individual result produced by a scan or analysis workflow. Findings combine severity, affected asset details, and remediation guidance.
