export type Role = "user" | "supervisor" | "approver" | "admin";

export type Department =
  | "ฝ่ายบริหารทั่วไป"
  | "กลุ่มงานพัฒนาฝีมือแรงงาน"
  | "กลุ่มงานมาตรฐานฝีมือแรงงานและรับรองความรู้ความสามารถ"
  | "กลุ่มงานแผนงานและสารสนเทศ";

export type RequestStatus = "pending" | "supervisor_approved" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  full_name: string;
  position: string;
  department: Department;
  role: Role;
  is_approved: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_type: string;
  is_active: boolean;
  created_at: string;
}

export interface VehicleRequest {
  id: string;
  requester_id: string;
  request_date: string;
  departure_datetime: string;
  return_datetime: string;
  destination: string;
  purpose: string;
  passengers: string | null;
  status: RequestStatus;
  supervisor_id: string | null;
  supervisor_approved_at: string | null;
  supervisor_comment: string | null;
  approver_id: string | null;
  approved_at: string | null;
  approver_comment: string | null;
  approved_vehicle_id: string | null;
  approved_driver_name: string | null;
  requester_signature: string | null;
  supervisor_signature: string | null;
  approver_signature: string | null;
  created_at: string;
  // Joined fields
  requester?: User;
  supervisor?: User;
  approver?: User;
  approved_vehicle?: Vehicle;
}
