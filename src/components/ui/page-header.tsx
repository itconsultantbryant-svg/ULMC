import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  lede,
  children,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-masthead border-b border-line">
      <div className="container-page py-10 sm:py-14">
        <div className="max-w-3xl">
          {kicker ? <p className="kicker mb-2">{kicker}</p> : null}
          <h1 className="text-balance text-3xl leading-[1.1] sm:text-4xl lg:text-[2.9rem]">{title}</h1>
          {lede ? <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-muted">{lede}</p> : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
      </div>
    </header>
  );
}
