import NewMapPickerClient from "@/components/suite/workspaces/NewMapPickerClient";

// Thin wrapper — the suite layout already mounts the shell. We return the picker as
// children so the layout renders it inside the workspace area (no double-mount).
export default function NewMapPage() {
  return <NewMapPickerClient />;
}
