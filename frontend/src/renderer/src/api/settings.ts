import client from "./client";

export interface Machine {
  id: number;
  name: string;
  machine_type: string;
  hourly_rate: number;
  notes?: string;
}

export interface MachineInput {
  name: string;
  machine_type: string;
  hourly_rate: number;
  notes?: string;
}

export async function getSettings(): Promise<Record<string, string>> {
  const r = await client.get("/settings/");
  return r.data;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await client.put(`/settings/${key}`, { value });
}

export async function getMachines(): Promise<Machine[]> {
  const r = await client.get("/settings/machines");
  return r.data;
}

export async function createMachine(data: MachineInput): Promise<Machine> {
  const r = await client.post("/settings/machines", data);
  return r.data;
}

export async function updateMachine(id: number, data: MachineInput): Promise<Machine> {
  const r = await client.put(`/settings/machines/${id}`, data);
  return r.data;
}

export async function deleteMachine(id: number): Promise<void> {
  await client.delete(`/settings/machines/${id}`);
}
