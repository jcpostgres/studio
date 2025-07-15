import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div className="grid gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-cyan-400">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-gray-400">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
