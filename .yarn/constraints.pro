% Ensure key React/Next dependencies resolve to a single version across the workspace.
gen_enforcedDependency("workspace:*", "react", "19.1.1").
gen_enforcedDependency("workspace:*", "react-dom", "19.1.1").
gen_enforcedDependency("workspace:*", "@types/react", "19.1.12").
gen_enforcedDependency("workspace:*", "@types/react-dom", "19.1.9").
gen_enforcedDependency("workspace:*", "next", "15.5.2").
gen_enforcedDependency("workspace:*", "typescript", "5.8.2").
