import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <div>
          <div className="inline-block rounded bg-white p-2">
            <Logo size="md" linked={false} />
          </div>
          <p className="mt-6 max-w-md font-serif text-3xl leading-tight text-white">
            The editorial workspace for the Department of Communication and Media Studies.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Draft, review, approve and publish reporting under the department&apos;s editorial
            standards. Every publication decision is recorded.
          </p>
        </div>
        <div className="space-y-2 text-xs text-white/50">
          <p>Access is limited to invited staff, editors and administrators.</p>
          <p>
            <Link href="/" className="underline hover:text-white">
              Return to the public site
            </Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:px-8">
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Editorial workspace
          </p>
          <Link href="/" className="text-xs font-semibold text-navy hover:text-red">
            Public site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="px-4 pb-6 text-center text-xs text-muted">
          Authorised access only. Activity is logged for accountability.
        </p>
      </div>
    </div>
  );
}
