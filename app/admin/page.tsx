import { isAdminRequest } from "@/lib/admin";
import { adminList } from "@/lib/store";
import { AdminBoard, AdminLogin } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminRequest())) {
    return <AdminLogin />;
  }
  const data = await adminList();
  return <AdminBoard initial={data} />;
}
