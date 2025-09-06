export type Role = "admin" | "staff" | "customer";

export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  created_at?: string | null;
};
