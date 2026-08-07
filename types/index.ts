export type UserRole = "SUPER_ADMIN" | "OWNER" | "EMPLOYEE";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type FieldType =
  | "TEXT" | "TEXTAREA" | "NUMBER" | "PHONE" | "EMAIL"
  | "DATE" | "RADIO" | "DROPDOWN" | "MULTISELECT" | "REPEATER" | "FILE";

export type RecordState = "OPEN" | "LOCKED" | "ARCHIVED";
