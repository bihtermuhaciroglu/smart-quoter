import client from "./client";

export interface FMEAItem {
  id: number;
  operation_id: number;
  failure_mode: string;
  effect_of_failure?: string;
  cause_of_failure?: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
  risk_level: string;
  recommended_action?: string;
  responsible_person?: string;
  created_at: string;
}

export async function getFMEA(operation_id?: number): Promise<FMEAItem[]> {
  const res = await client.get("/fmea", { params: { operation_id } });
  return res.data;
}

export async function createFMEA(
  data: Omit<FMEAItem, "id" | "created_at" | "rpn" | "risk_level">
): Promise<FMEAItem> {
  const res = await client.post("/fmea", data);
  return res.data;
}

export async function deleteFMEA(id: number): Promise<void> {
  await client.delete(`/fmea/${id}`);
}
