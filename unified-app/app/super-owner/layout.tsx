import { SuperOwnerLayout } from "@/components/super-owner/super-owner-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SuperOwnerLayout>{children}</SuperOwnerLayout>
}
