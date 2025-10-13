
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { SettingsCard, SettingsItem, SettingsHeaderCard } from '@/components/settings/settings-card';
import { useTheme } from '@/context/theme-context';
import { 
  Users, 
  FolderKanban, 
  ArrowRightLeft, 
  Landmark, 
  List, 
  FileText, 
  AreaChart,
  Bell,
  Moon,
  HelpCircle,
  LogOut,
  FileCog,
  BarChart2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
  const { userId, userProfile } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleLogout = async () => {
    // En modo local, simplemente redirigimos al login
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };
  
  const handleNotificationToggle = (checked: boolean) => {
    toast({
      variant: "destructive",
      title: "Función no disponible",
      description: "Las notificaciones no están disponibles en el modo de base de datos local.",
    });
  };


  return (
    <>
      <PageHeader
        title="Configuración General"
        description="Gestiona tu perfil, la configuración del sistema y las preferencias de la app."
      />
      <div className="mt-8 grid grid-cols-1 gap-8">
        
        {/* 1. User Profile */}
        <SettingsHeaderCard 
          user={userProfile} 
          onEdit={() => alert('Próximamente: Editar Perfil')} 
        />

        {/* 2. Data Management */}
        <SettingsCard sectionTitle="Gestión de datos">
          <SettingsItem
            icon={<Users className="text-purple-500" />}
            bgColor="bg-purple-500/10"
            title="Nómina"
            subtitle="Gestionar empleados y pagos"
            onClick={() => handleNavigate('/dashboard/payroll')}
          />
          <SettingsItem
            icon={<FolderKanban className="text-blue-500" />}
            bgColor="bg-blue-500/10"
            title="Clientes y Deudas"
            subtitle="Estado de cuentas por cobrar"
            onClick={() => handleNavigate('/dashboard/clients-debts')}
          />
          <SettingsItem
            icon={<FileCog className="text-indigo-500" />}
            bgColor="bg-indigo-500/10"
            title="Pagos Administrativos"
            subtitle="Servicios, alquileres y más"
            onClick={() => handleNavigate('/dashboard/admin-payments')}
          />
        </SettingsCard>
        
        {/* 3. System Configuration */}
        <SettingsCard sectionTitle="Configuración del sistema">
          <SettingsItem
            icon={<Landmark className="text-teal-500" />}
            bgColor="bg-teal-500/10"
            title="Configurar Cuentas"
            subtitle="Gestionar cuentas y comisiones"
            onClick={() => handleNavigate('/dashboard/accounts')}
          />
          <SettingsItem
            icon={<List className="text-green-500" />}
            bgColor="bg-green-500/10"
            title="Categorías y Listas"
            subtitle="Gestionado en cada sección"
          />
        </SettingsCard>

        {/* 4. Advanced Reports */}
        <SettingsCard sectionTitle="Informes Avanzados">
           <SettingsItem
            icon={<BarChart2 className="text-cyan-500" />}
            bgColor="bg-cyan-500/10"
            title="Reporte de Servicios"
            subtitle="Analiza tus servicios más vendidos"
            onClick={() => handleNavigate('/dashboard/service-report')}
          />
          <SettingsItem
            icon={<FileText className="text-red-500" />}
            bgColor="bg-red-500/10"
            title="Exportar Datos"
            subtitle="Descargar reportes CSV desde Total General"
            onClick={() => handleNavigate('/dashboard/total-general')}
          />
        </SettingsCard>

        {/* 5. App Preferences */}
        <SettingsCard sectionTitle="Preferencias de la App">
          <SettingsItem
            icon={<Bell className="text-gray-500" />}
            bgColor="bg-gray-500/10"
            title="Notificaciones (No disponible)"
            subtitle="Requiere conexión a Firebase"
            isSwitch
            switchState={false}
            onSwitchChange={handleNotificationToggle}
            disabled={true}
          />
          <SettingsItem
            icon={<Moon className="text-gray-500" />}
            bgColor="bg-gray-500/10"
            title="Modo Oscuro"
            subtitle="Apariencia de la aplicación"
            isSwitch
            switchState={theme === 'dark'}
            onSwitchChange={toggleTheme}
          />
        </SettingsCard>

         {/* 6. Support */}
        <SettingsCard sectionTitle="Soporte">
          <SettingsItem
            icon={<HelpCircle className="text-cyan-500" />}
            bgColor="bg-cyan-500/10"
            title="Ayuda y Soporte"
            subtitle="Preguntas frecuentes y contacto"
            isComingSoon
          />
          <SettingsItem
            icon={<LogOut className="text-red-500" />}
            bgColor="bg-red-500/10"
            title="Cerrar Sesión"
            subtitle="Salir de la aplicación"
            onClick={handleLogout}
            isDestructive
          />
        </SettingsCard>
      </div>
    </>
  );
}
