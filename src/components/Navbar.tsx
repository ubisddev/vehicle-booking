"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/types";

export default function Navbar({ user }: { user: User | null }) {
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = "session=; path=/; max-age=0";
    router.push("/login");
  };

  if (!user) return null;

  return (
    <nav className="bg-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold hover:text-blue-200">
            🚗 AI-UBISD Vehicle Intelligent System
          </Link>
          <Link href="/dashboard" className="hover:text-blue-200 text-sm">
            รายการขอใช้รถ
          </Link>
          <Link href="/dashboard/analytics" className="hover:text-blue-200 text-sm">
            สถิติ
          </Link>
          <Link href="/request/new" className="hover:text-blue-200 text-sm">
            ขอใช้รถ
          </Link>
          {user.role === "admin" && (
            <>
              <Link href="/admin/users" className="hover:text-blue-200 text-sm">
                จัดการผู้ใช้
              </Link>
              <Link href="/admin/vehicles" className="hover:text-blue-200 text-sm">
                จัดการรถยนต์
              </Link>
              <Link href="/admin/departments" className="hover:text-blue-200 text-sm">
                จัดการกลุ่มงาน
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user.full_name} ({user.position})</span>
          <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );
}
