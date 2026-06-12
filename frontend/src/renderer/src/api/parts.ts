import client from "./client";

export interface Part {
  id: number;
  name: string;
  drawing_number?: string;
  material_type?: string;
  material_grade?: string;
  quantity_required: number;
  notes?: string;
  created_at: string; // ISO datetime string from backend
}

export async function getParts(): Promise<Part[]> {
  const response = await client.get("/parts");
  return response.data;
}

export async function createPart(data: Omit<Part, "id" | "created_at">): Promise<Part> {
  const response = await client.post("/parts", data);
  return response.data;
}

export async function deletePart(id: number): Promise<void> {
  await client.delete(`/parts/${id}`);
}
