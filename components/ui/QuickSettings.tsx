"use client";

import Panel from "../apps/quick-settings/Panel";

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => <Panel open={open} />;

export default QuickSettings;
