"use client";

interface TopbarProps {
  page: string;
  where: string | null;
}

export function Topbar({ page, where }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span className="here">{page}</span>
        {where && <span className="sep">/</span>}
        {where && <span className="where">{where}</span>}
      </div>
      <div className="top-actions" />
    </header>
  );
}
