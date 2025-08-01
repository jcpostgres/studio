
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Header Card for User Profile ---
interface SettingsHeaderCardProps {
  user: { name?: string | null; email?: string | null } | null;
  onEdit: () => void;
}

export function SettingsHeaderCard({ user, onEdit }: SettingsHeaderCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-6 w-6" />
        </div>
        <div className="flex-grow">
          <h3 className="text-base font-semibold text-foreground">{user?.name || 'Usuario'}</h3>
          <p className="text-sm text-muted-foreground">{user?.email || 'Sin email'}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      </CardContent>
    </Card>
  );
}


// --- Generic Card for Settings Sections ---
interface SettingsCardProps {
  sectionTitle: string;
  children: React.ReactNode;
}

export function SettingsCard({ sectionTitle, children }: SettingsCardProps) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">{sectionTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}


// --- Item for inside a SettingsCard ---
interface SettingsItemProps {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  isComingSoon?: boolean;
  isSwitch?: boolean;
  switchState?: boolean;
  onSwitchChange?: (checked: boolean) => void;
  isDestructive?: boolean;
}

export function SettingsItem({
  icon,
  bgColor,
  title,
  subtitle,
  onClick,
  isComingSoon = false,
  isSwitch = false,
  switchState = false,
  onSwitchChange = () => {},
  isDestructive = false
}: SettingsItemProps) {

  const content = (
    <>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div className="flex-grow">
        <h4 className={cn("text-base font-semibold", isDestructive ? "text-red-500" : "text-foreground")}>{title}</h4>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center">
        {isComingSoon && <Badge variant="outline">Próximamente</Badge>}
        {isSwitch && <Switch checked={switchState} onCheckedChange={onSwitchChange} />}
        {!isComingSoon && !isSwitch && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </div>
    </>
  );

  const itemClasses = cn(
    "flex items-center gap-4 p-4 border-t border-border",
    {
      "cursor-pointer hover:bg-muted/50 transition-colors": !!onClick && !isComingSoon,
      "opacity-50 cursor-not-allowed": isComingSoon
    }
  );

  return onClick && !isComingSoon && !isSwitch ? (
    <button onClick={onClick} className={itemClasses} style={{ width: '100%' }}>
      {content}
    </button>
  ) : (
    <div className={itemClasses}>
      {content}
    </div>
  );
}
