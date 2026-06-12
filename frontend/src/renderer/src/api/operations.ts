import client from "./client";

export interface Operation {
  id: number;
  part_id: number;
  sequence_no: number;
  operation_type: string;
  machine_name?: string;
  tool_name?: string;
  setup_time_min: number;
  cycle_time_min: number;
  machine_rate_hr: number;
  tool_cost: number;
  notes?: string;
  created_at: string;
  machining_cost: number;
}

export async function getOperations(part_id?: number): Promise<Operation[]> {
  const res = await client.get("/operations", { params: { part_id } });
  return res.data;
}

export async function createOperation(
  data: Omit<Operation, "id" | "created_at" | "machining_cost">
): Promise<Operation> {
  const res = await client.post("/operations", data);
  return res.data;
}

export async function deleteOperation(id: number): Promise<void> {
  await client.delete(`/operations/${id}`);
}
