import {
  approveControlCommand,
  createControlCommand
} from "@airwise/database";

type CommandRecord = {
  id: string;
  buildingId: string;
  pointId: string;
  commandType: string;
  requestedValue: string;
  status: string;
};

export function createCommand(input: Omit<CommandRecord, "id" | "status">) {
  return createControlCommand(input);
}

export function approveCommand(commandId: string) {
  return approveControlCommand(commandId);
}
