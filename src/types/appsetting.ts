export type AppSettings = {
  id: number;
  is_system_open: boolean;
  open_time: string; 
  close_time: string; 
  days_ahead: number; 
  store_name: string | null;
  store_image_url: string | null;
  contact_phone: string | null;
  contact_ig: string | null;
  contact_facebook: string | null;
  menu_url: string | null;
  updated_at?: string | null;
};