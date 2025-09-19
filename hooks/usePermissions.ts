import { useContext } from "react";
import {
  PermissionContext,
  type PermissionContextValue,
  type PermissionEntry,
  type PermissionId,
  type PermissionStatus,
} from "../components/common/PermissionPrompt";

const usePermissions = (): PermissionContextValue => {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionPromptProvider");
  }
  return ctx;
};

export type {
  PermissionContextValue,
  PermissionEntry,
  PermissionId,
  PermissionStatus,
};

export default usePermissions;
