// src/admin/types.ts
export type User = {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  is_admin?: boolean;
  tokens?: number;
};

export type Payment = any;
export type Template = { id: string; name: string; storage_path: string; created_at: string };
