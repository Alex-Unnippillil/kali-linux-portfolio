import React from "react";
import PolicyPage from "../components/PolicyPage";
import PolicyIndex from "../components/policy/PolicyIndex";

const LegalPage: React.FC = () => (
  <PolicyPage
    title="Policies"
    author="Portfolio Maintainer"
    updated="2024-09-07"
  >
    <PolicyIndex />
    <p className="text-xs text-gray-500">
      This portfolio is an independent project and is not affiliated with or
      endorsed by Kali Linux, Offensive Security, or any of their subsidiaries.
      Please review the official policies above for authoritative information.
    </p>
  </PolicyPage>
);

export default LegalPage;
