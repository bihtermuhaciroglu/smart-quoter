import client from "./client";

export interface Quote {
  id: number;
  part_id: number;
  quote_number: string;
  customer_name?: string;
  customer_contact?: string;
  quantity: number;
  material_cost: number;
  total_machining_cost: number;
  overhead_rate: number;
  profit_margin: number;
  total_cost: number;
  unit_price: number;
  valid_until?: string;
  status: string;
  notes?: string;
  created_at: string;
}

export async function getQuotes(): Promise<Quote[]> {
  const res = await client.get("/quotes");
  return res.data;
}

export async function createQuote(data: {
  part_id: number;
  quote_number: string;
  customer_name?: string;
  customer_contact?: string;
  quantity: number;
  material_cost: number;
  overhead_rate: number;
  profit_margin: number;
  valid_until?: string;
  notes?: string;
}): Promise<Quote> {
  const res = await client.post("/quotes", data);
  return res.data;
}

export async function updateQuoteStatus(id: number, status: string): Promise<void> {
  await client.patch(`/quotes/${id}/status`, null, { params: { status } });
}

export async function deleteQuote(id: number): Promise<void> {
  await client.delete(`/quotes/${id}`);
}
